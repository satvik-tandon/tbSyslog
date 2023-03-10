/*
 * Copyright (C) 2020 Graylog, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the Server Side Public License, version 1,
 * as published by MongoDB, Inc.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Server Side Public License for more details.
 *
 * You should have received a copy of the Server Side Public License
 * along with this program. If not, see
 * <http://www.mongodb.com/licensing/server-side-public-license>.
 */
// @flow strict
import * as React from 'react';
import { useState } from 'react';
import chroma from 'chroma-js';
import PropTypes from 'prop-types';
import styled, { css } from 'styled-components';
import type { StyledComponent } from 'styled-components';

import type { ThemeInterface } from 'theme';
import { type ViewMetaData as ViewMetadata } from 'views/stores/ViewMetadataStore';
import QueryResult from 'views/logic/QueryResult';
import SearchPageLayoutContext, { type SearchPageLayout } from 'views/components/contexts/SearchPageLayoutContext';

import SidebarNavigation from './SidebarNavigation';
import ContentColumn from './ContentColumn';
import sidebarSections, { type SidebarSection } from './sidebarSections';

import CustomPropTypes from '../CustomPropTypes';

type Props = {
  children: React.Element<any>,
  queryId: string,
  results: QueryResult,
  searchPageLayout: ?SearchPageLayout,
  sections: Array<SidebarSection>,
  viewIsNew: boolean,
  viewMetadata: ViewMetadata,
};

const Container = styled.div`
  display: flex;
  height: 100%;
  width: min-content;
`;

const ContentOverlay: StyledComponent<{}, ThemeInterface, HTMLDivElement> = styled.div(({ theme }) => css`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 50px;
  right: 0;
  background: ${chroma(theme.colors.brand.tertiary).alpha(0.25).css()};
  z-index: 2;
`);

const _toggleSidebar = (initialSectionKey: string, activeSectionKey: ?string, setActiveSectionKey) => {
  if (activeSectionKey) {
    setActiveSectionKey(null);

    return;
  }

  setActiveSectionKey(initialSectionKey);
};

const _selectSidebarSection = (sectionKey, activeSectionKey, setActiveSectionKey, toggleSidebar) => {
  if (sectionKey === activeSectionKey) {
    toggleSidebar();

    return;
  }

  setActiveSectionKey(sectionKey);
};

const Sidebar = ({ searchPageLayout, results, children, queryId, sections, viewMetadata, viewIsNew }: Props) => {
  const sidebarIsPinned = searchPageLayout?.config.sidebar.isPinned ?? false;
  const initialSectionKey = sections[0].key;
  const [activeSectionKey, setActiveSectionKey] = useState<?string>(sidebarIsPinned ? initialSectionKey : null);
  const activeSection = sections.find((section) => section.key === activeSectionKey);
  const toggleSidebar = () => _toggleSidebar(initialSectionKey, activeSectionKey, setActiveSectionKey);
  const selectSidebarSection = (sectionKey: string) => _selectSidebarSection(sectionKey, activeSectionKey, setActiveSectionKey, toggleSidebar);
  const SectionContent = activeSection?.content;

  return (
    <Container>
      <SidebarNavigation activeSection={activeSection}
                         selectSidebarSection={selectSidebarSection}
                         toggleSidebar={toggleSidebar}
                         sections={sections}
                         sidebarIsPinned={sidebarIsPinned} />
      {activeSection && !!SectionContent && (
        <ContentColumn closeSidebar={toggleSidebar}
                       searchPageLayout={searchPageLayout}
                       sectionTitle={activeSection.title}
                       viewIsNew={viewIsNew}
                       viewMetadata={viewMetadata}>
          <SectionContent results={results}
                          queryId={queryId}
                          sidebarChildren={children}
                          sidebarIsPinned={sidebarIsPinned}
                          toggleSidebar={toggleSidebar}
                          viewMetadata={viewMetadata} />
        </ContentColumn>
      )}
      {(activeSection && !sidebarIsPinned) && (
        <ContentOverlay onClick={toggleSidebar} />
      )}
    </Container>
  );
};

Sidebar.propTypes = {
  children: CustomPropTypes.OneOrMoreChildren.isRequired,
  queryId: PropTypes.string.isRequired,
  results: PropTypes.object,
  sections: PropTypes.arrayOf(PropTypes.object),
  viewIsNew: PropTypes.bool.isRequired,
  viewMetadata: PropTypes.shape({
    activeQuery: PropTypes.string,
    description: PropTypes.string,
    id: PropTypes.string,
    summary: PropTypes.string,
    title: PropTypes.string,
  }).isRequired,
};

Sidebar.defaultProps = {
  results: {},
  sections: sidebarSections,
};

const SidebarWithContext = (props: Props) => (
  <SearchPageLayoutContext.Consumer>
    {(searchPageLayout) => {
      return <Sidebar {...props} searchPageLayout={searchPageLayout} />;
    }}
  </SearchPageLayoutContext.Consumer>
);

export default SidebarWithContext;
