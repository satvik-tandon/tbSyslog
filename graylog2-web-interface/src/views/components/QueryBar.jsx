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
import React from 'react';
import PropTypes from 'prop-types';

import connect from 'stores/connect';
import { TitlesActions } from 'views/stores/TitlesStore';
import { ViewActions } from 'views/stores/ViewStore';
import NewQueryActionHandler from 'views/logic/NewQueryActionHandler';
import { QueriesActions } from 'views/stores/QueriesStore';
import { QueryIdsStore } from 'views/stores/QueryIdsStore';
import { QueryTitlesStore } from 'views/stores/QueryTitlesStore';
import { ViewMetadataStore } from 'views/stores/ViewMetadataStore';
import { ViewStatesActions } from 'views/stores/ViewStatesStore';

import QueryTabs from './QueryTabs';
import CustomPropTypes from './CustomPropTypes';

const onTitleChange = (queryId, newTitle) => TitlesActions.set('tab', 'title', newTitle);

const onSelectQuery = (queryId) => (queryId === 'new' ? NewQueryActionHandler() : ViewActions.selectQuery(queryId));

const onCloseTab = (queryId, currentQuery, queries) => {
  if (queries.size === 1) {
    return Promise.resolve();
  }

  let promise;

  if (queryId === currentQuery) {
    const currentQueryIdIndex = queries.indexOf(queryId);
    const newQueryIdIndex = Math.min(0, currentQueryIdIndex - 1);
    const newQuery = queries.remove(queryId).get(newQueryIdIndex);

    promise = ViewActions.selectQuery(newQuery);
  } else {
    promise = Promise.resolve();
  }

  return promise.then(() => QueriesActions.remove(queryId)).then(() => ViewStatesActions.remove(queryId));
};

const QueryBar = ({ children, queries, queryTitles, viewMetadata }) => {
  const { activeQuery } = viewMetadata;
  const childrenWithQueryId = React.Children.map(children, (child) => React.cloneElement(child, { queryId: activeQuery }));
  const selectQueryAndExecute = (queryId) => onSelectQuery(queryId);

  return (
    <QueryTabs queries={queries}
               selectedQueryId={activeQuery}
               titles={queryTitles}
               onSelect={selectQueryAndExecute}
               onTitleChange={onTitleChange}
               onRemove={(queryId) => onCloseTab(queryId, activeQuery, queries)}>
      {childrenWithQueryId}
    </QueryTabs>
  );
};

QueryBar.propTypes = {
  children: CustomPropTypes.node,
  queries: PropTypes.object.isRequired,
  queryTitles: PropTypes.object.isRequired,
  viewMetadata: PropTypes.shape({
    activeQuery: PropTypes.string.isRequired,
  }).isRequired,
};

QueryBar.defaultProps = {
  children: null,
};

export default connect(QueryBar, { queries: QueryIdsStore, queryTitles: QueryTitlesStore, viewMetadata: ViewMetadataStore });
