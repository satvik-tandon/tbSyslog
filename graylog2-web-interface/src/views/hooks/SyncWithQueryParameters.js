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
import { useEffect } from 'react';
import * as Immutable from 'immutable';
import URI from 'urijs';

import history from 'util/History';
import { ViewStore } from 'views/stores/ViewStore';
import View from 'views/logic/views/View';
import { QueriesActions } from 'views/actions/QueriesActions';
import type { TimeRange } from 'views/logic/queries/Query';
import { filtersToStreamSet } from 'views/logic/queries/Query';

const useActionListeners = (actions, callback, dependencies) => {
  useEffect(() => {
    const unsubscribes = actions.map((action) => action.listen(callback));

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, dependencies);
};

const extractTimerangeParams = (timerange: TimeRange) => {
  const { type } = timerange;
  const result = { rangetype: type };

  switch (timerange.type) {
    case 'relative': return Object.entries({ ...result, relative: timerange.range });
    case 'keyword': return Object.entries({ ...result, keyword: timerange.keyword });
    case 'absolute': return Object.entries({ ...result, from: timerange.from, to: timerange.to });
    default: return Object.entries(result);
  }
};

export const syncWithQueryParameters = (query: string, action: (string) => mixed = history.push) => {
  const { view } = ViewStore.getInitialState() || {};

  if (view && view.type === View.Type.Search) {
    const { queries } = view.search;

    if (queries.size !== 1) {
      throw new Error('Searches must only have a single query!');
    }

    const firstQuery = queries.first();

    if (firstQuery) {
      const { query: { query_string: queryString }, timerange, filter = Immutable.Map() } = firstQuery;
      const baseUri = new URI(query).setSearch('q', queryString)
        .removeQuery('from')
        .removeQuery('to')
        .removeQuery('keyword')
        .removeQuery('relative');
      const uriWithTimerange = extractTimerangeParams(timerange)
        .reduce((prev, [key, value]) => prev.setSearch(key, value), baseUri);
      const currentStreams = filtersToStreamSet(filter);
      const uri = currentStreams.isEmpty()
        ? uriWithTimerange.removeSearch('streams').toString()
        : uriWithTimerange.setSearch('streams', currentStreams.join(',')).toString();

      if (query !== uri) {
        action(uri);
      }
    }
  }
};

export const useSyncWithQueryParameters = (query: string) => {
  useEffect(() => syncWithQueryParameters(query, history.replace), []);

  useActionListeners(
    [QueriesActions.update.completed, QueriesActions.query.completed],
    () => syncWithQueryParameters(query),
    [query],
  );
};
