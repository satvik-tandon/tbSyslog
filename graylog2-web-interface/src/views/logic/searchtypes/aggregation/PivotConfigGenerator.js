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
import uuid from 'uuid/v4';
import { Set } from 'immutable';

import { parseSeries } from 'views/logic/aggregationbuilder/Series';
import AggregationWidgetConfig from 'views/logic/aggregationbuilder/AggregationWidgetConfig';
import Pivot from 'views/logic/aggregationbuilder/Pivot';
import type { Definition } from 'views/logic/aggregationbuilder/Series';

import type { TimeUnit } from '../../../Constants';
import SortConfig from '../../aggregationbuilder/SortConfig';

const mapTimeunit = (unit: TimeUnit) => {
  switch (unit) {
    case 'seconds': return 's';
    case 'minutes': return 'm';
    case 'hours': return 'h';
    case 'days': return 'd';
    case 'weeks': return 'w';
    case 'months': return 'M';
    default: throw new Error(`Invalid time unit: ${unit}`);
  }
};

type FormattedPivot = {
  type: string,
  field: string,
  interval: {
    timeunit: string,
    type: string,
  },
};

type TimeConfig = {|
  interval: 'timeunit',
  unit: TimeUnit,
  value: number,
|};

const formatPivot = (pivot: Pivot): FormattedPivot => {
  const { type, field, config } = pivot;
  const newConfig = { ...config };

  switch (type) {
    // eslint-disable-next-line no-case-declarations
    case 'time':
      // $FlowFixMe: ConfigType is not properly typed yet
      if (newConfig.interval.type === 'timeunit') {
        const { interval } = newConfig;
        // $FlowFixMe: We know this is the right type
        const { unit, value } = (interval: { interval: TimeConfig });

        newConfig.interval = { type: 'timeunit', timeunit: `${value}${mapTimeunit(unit)}` };
      }

      break;
    default:
  }

  // $FlowFixMe: Not properly typed yet.
  return {
    type,
    field,
    ...newConfig,
  };
};

type FormattedSeries = $Shape<{
  id: string,
} & Definition>;

const generateConfig = (id: string, name: string, { rollup, rowPivots, columnPivots, series, sort }: AggregationWidgetConfig) => ({
  id,
  name,
  type: 'pivot',
  config: {
    id: 'vals',
    rollup,
    row_groups: rowPivots.map(formatPivot),
    column_groups: columnPivots.map(formatPivot),
    series: series.map<FormattedSeries>((s) => ({ id: s.effectiveName, ...parseSeries(s.function) })),
    sort: sort,
  },
});

export default ({ config }: { config: AggregationWidgetConfig }) => {
  const chartConfig = generateConfig(uuid(), 'chart', config);

  // eslint-disable-next-line no-use-before-define
  const configBuilder = ConfigBuilder.create([chartConfig]);

  // TODO: This should go into a visualization config specific function
  // $FlowFixMe: This is a NumberVisualizationConfig. We know so for config.visualization is 'numeric'.
  if (config.visualization === 'numeric' && config.visualizationConfig && config.visualizationConfig.trend) {
    const trendConfig = {
      ...(generateConfig(uuid(), 'trend', config)),
      timerange: { type: 'offset', source: 'search_type', id: chartConfig.id },
    };

    configBuilder.add(trendConfig);
  }

  if (config.eventAnnotation) {
    const eventAnnotationConfig = {
      id: uuid(),
      name: 'events',
      type: 'events',
    };

    configBuilder.add(eventAnnotationConfig);
  }

  return configBuilder.build();
};

type Config = {
  id: string,
  name: string,
  type: string,
  config?: {
    id: string,
    rollup: boolean,
    row_groups: Array<FormattedPivot>,
    column_groups: Array<FormattedPivot>,
    series: Array<FormattedSeries>,
    sort: Array<SortConfig>,
  },
  timerange?: {
    type: string,
    source: string,
    id: string,
  },
};

class ConfigBuilder {
  value: Set<Config>;

  constructor(values: Array<any>) {
    this.value = Set.of(...values);
  }

  add(val: Config) {
    this.value = this.value.add(val);

    return this;
  }

  build(): Array<Config> {
    return this.value.toArray();
  }

  static create(values = []) {
    return new ConfigBuilder(values);
  }
}
