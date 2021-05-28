import {
    VNodeType,
    defineAction,
    VirtualPropType,
    getVNodeType,
    C,
    isVNodeType,
    DerivedProperty,
    VNodeKey,
    VNID,
    Field,
} from "vertex-framework";


interface ArticleSection {
    readonly title: string,
    readonly code: string,
}
function ArticleSections<AS extends {[K: string]: ArticleSection}>(sections: AS): AS {
    return sections;
}


/**
 * Some TechDB entries (TechConcept, Process, Design, etc.) are "articles" - they have long-form prose text (in
 * paragraphs), describing the thing in question, much like Wikipedia articles. The "article" is stored as a separate
 * VNode and there is a 1:1 relationship between these entries and the Article, although the Article may not exist.
 * 
 * Every entry type (e.g. TechConcept) that is an article has a standard "template" - an ordered list of headings for
 * articles of that type (e.g. "Overview", "Applications", "See Also"). So the article is split into sections, according
 * to the template. Each of those sections is an ArticleSection.
 */
@VNodeType.declare
export class Article extends VNodeType {
    static label = "Article";

    /**
     * All possible article sections that any TechDB entries can have
     *
     * Each specific type, like "TechConcept" supports only a subset of these.
     *
     * "code" is like an ID for each section. It is intentionally short and obscure because (unlike Title), it does not
     * get internationalized.
     *
     * Only the first letter of the title should be capitalized.
     */
    static readonly Sections = ArticleSections({
        Overview: {title: "Overview", code: "ovw"},
        Applications: {title: "Applications", code: "app"},
        Types: {title: "Types", code: "tps"},
        InDepth: {title: "In depth", code: "det"},
        Components: {title: "Components", code: "cmp"},
        AdvantagesTradeoffs: {title: "Advantages and tradeoffs", code: "ato"},
        // Things to have in mind when designing an instance of this concept:
        DesignConsiderations: {title: "Design considerations", code: "dcs"},
        Standards: {title: "Standards", code: "sts"},
        Manufacturing: {title: "Manufacturing", code: "mfg"},
        Operation: {title: "Operation", code: "opn"},
        Maintenance: {title: "Maintenance", code: "mnt"},
        Lifecycle: {title: "Lifecycle", code: "lcl"},
        Economics: {title: "Economics", code: "ecn"},
        // Impact on society, the environment, etc.
        Impact: {title: "Impact", code: "ipm"},
        SeeAlso: {title: "See also", code: "sas"},
    });
    static readonly properties = {
        ...VNodeType.properties,

        // Sections for a "TechConcept" article type:
        ...(Object.fromEntries(Object.values(Article.Sections).map(s => [s.code, Field.String]))),
    };
}


/**
 * A TechDB entry type (VNodeType) that can have an article associated with it.
 */
interface TechDbEntryWithArticle {
    rel: {
        HAS_ARTICLE: any/*{
            label: "HAS_ARTICLE",
            to: [Article],
        }*/,
    };
    virtualProperties: {
        articleVNode: {
            type: typeof VirtualPropType.OneRelationship,
            target: Article,
        },
    };
    Sections: ArticleSection[];
}

// Helper to ensure correct typing for VNodeTypes with associated articles.
export function TechDbEntryWithArticle<T extends VNodeType>(t: T & TechDbEntryWithArticle): T {return t;}

function isTechDbEntryWithArticle(vnt: any): vnt is TechDbEntryWithArticle {
    return (
        isVNodeType(vnt) && 
        vnt.rel.HAS_ARTICLE?.to?.[0] === Article &&
        (vnt.virtualProperties as any).articleVNode.target === Article &&
        (vnt as any).Sections !== undefined
    );
}


interface ArticleSectionWithMDT extends ArticleSection {
    /** The content of this article section, in MDT (MarkDown for Technotes) */
    content: string;
}

/**
 * Derived property to render the HTML version of a TechDB entry's article, section by section
 */
export function articleSections(vnodeType: VNodeType): DerivedProperty<ArticleSectionWithMDT[]>{
    if (isTechDbEntryWithArticle(vnodeType)) {
        return DerivedProperty.make(
            vnodeType,
            (entry: any) => entry.articleVNode((a: any) => a.allProps),
            entryData => {
                return vnodeType.Sections.map(s => ({
                    title: s.title,
                    code: s.code,
                    content: (entryData as any).articleVNode?.[s.code] || "",
                }));
            },
        )
    }
    throw new Error(`VNodeType ${vnodeType.name} is not a TechDbEntryWithArticle.`);
}



/** Edit the article for an entry in TechDb */
export const EditArticle = defineAction({
    type: "EditArticle",
    parameters: {} as {
        // Which type of article we're editing, e.g. "TechConcept"
        entryTypeLabel: string,
        // The slugId or VNID of the article to edit.
        entryId: VNodeKey,
        // The code of the specific section to edit, e.g. "ov" for Overview
        sectionCode: string,
        // The new markdown string for the entire section
        newMarkdown: string,
    },
    resultData: {} as {
        oldMarkdown: string,
    },
    apply: async (tx, data) => {

        // Get the entry type we're editing
        const entryType = getVNodeType(data.entryTypeLabel)

        if (!(isTechDbEntryWithArticle(entryType))) {
            throw new Error(`Unsupported entry type "${data.entryTypeLabel}" - doesn't seem to support articles.`);
        }

        const allowedSectionCodes = entryType.Sections.map(s => s.code);

        // Validate sectionCode, especially since we use it unescaped in the cypher query below:
        let sectionCodeSafe: string;
        if (allowedSectionCodes.includes(data.sectionCode)) {
            sectionCodeSafe = data.sectionCode;
        } else {
            throw new Error(`Entry of type ${entryType.name} does not support an article section with code "${data.sectionCode}"`);
        }

        // Get the entry that we're editing, and the associated article section, if it currently exists:
        const result = await tx.queryOne(C`
            MATCH (entry:${entryType}), entry HAS KEY ${data.entryId}
            MERGE (entry)-[:HAS_ARTICLE]->(a:${Article})
                ON CREATE SET a.id = ${VNID()}
            RETURN entry.id as entryId, a.id as articleId, a.${C(sectionCodeSafe)} as articleMarkdown
        `.givesShape({"entryId": Field.VNID, "articleId": Field.VNID, "articleMarkdown": Field.NullOr.String}));
        const articleId = result.articleId;

        // Now update the article section:
        if (data.newMarkdown.trim() === "") {
            // We are removing this section from the article:
            await tx.query(C`
                MATCH (a:${Article} {id: ${articleId}})
                REMOVE a.${C(sectionCodeSafe)}
            `);
        } else {
            await tx.query(C`
                MATCH (a:${Article} {id: ${articleId}})
                SET a.${C(sectionCodeSafe)} = ${data.newMarkdown}
            `);
        }

        return {
            resultData: {
                // Return the old text of this section, so we can undo this edit in the future:
                oldMarkdown: result.articleMarkdown ?? "",
            },
            // Editing an article counts as modifying both the entry and the article:
            modifiedNodes: [result.entryId, articleId],
            description: `Edited ${Article.withId(articleId)}`,
        };
    },
});
