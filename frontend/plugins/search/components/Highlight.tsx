import { connectHighlight } from 'react-instantsearch-dom';
import { HighlightProps } from 'react-instantsearch-core';
import { Doc } from './Doc';



const CustomHighlight: React.FunctionComponent<HighlightProps<Doc>> = ({ highlight, attribute, hit }) => {
    const parsedHit = highlight({
        highlightProperty: '_highlightResult',
        attribute,
        hit,
    });

    return (
        <span className={`result-highlight-${attribute}`}>
        {parsedHit.map(
            (part, index) =>
            part.isHighlighted ? (
                <mark className="bg-yellow-200 text-inherit" key={index}>{part.value}</mark>
            ) : (
                <span key={index}>{part.value}</span>
            )
        )}
        </span>
    );
};

export const Highlight = connectHighlight(CustomHighlight);
