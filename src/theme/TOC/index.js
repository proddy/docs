import TOCStyles from '@docusaurus/theme-classic/lib/theme/TOC/styles.module.css';
import Translate from '@docusaurus/Translate';
import AdCard from '@site/src/components/AdCard';
import TOC from '@theme-original/TOC';
import React from 'react';

export default function TOCWrapper(props) {
  return (
    <div className={TOCStyles.tableOfContents}>
      <AdCard
        img={require('@site/static/img/collect.jpg').default}
        className="margin-bottom--sm"
        href="https://github.com/alovajs/alova/issues/165">
        <Translate id="ad.project collection">
          Is using alova in your project? please tell me!
        </Translate>
      </AdCard>
      <TOC {...props} />
    </div>
  );
}
