import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths, } from 'next'
import { ParsedUrlQuery } from 'querystring';

import { Page } from 'components/Page';

interface PageProps {
    searchTerm: string;
}
interface PageUrlQuery extends ParsedUrlQuery {
    searchTerm: string;
}

// This function gets called at build time
export const getStaticPaths: GetStaticPaths<PageUrlQuery> = async () => {
    return {
      // Which pages (TechDB entries) to pre-generate at build time.
      // This should be set to a list of popular pages.
      paths: [],
      // Enable statically generating any additional pages as needed
      fallback: true,
    }
  }

export const getStaticProps: GetStaticProps<PageProps, PageUrlQuery> = async (context) => {
    return {
      props: {
          searchTerm: context.params.searchTerm,
      },
    }
}  

const QuickSearchPage: NextPage<PageProps> = function(props) {

    return <Page title={`Quick Search: ${props.searchTerm}`}>
        <p>Quick Search: <strong>{props.searchTerm}</strong></p>
    </Page>;
}

export default QuickSearchPage;
