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

import React, { useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment-timezone';
import { merge } from 'lodash';

import AppConfig from 'util/AppConfig';
import connect from 'stores/connect';
import AggregationWidgetConfig from 'views/logic/aggregationbuilder/AggregationWidgetConfig';
import { CurrentQueryStore } from 'views/stores/CurrentQueryStore';
import Query from 'views/logic/queries/Query';
import type { ViewType } from 'views/logic/views/View';
import CurrentUserContext from 'contexts/CurrentUserContext';

import GenericPlot from './GenericPlot';
import OnZoom from './OnZoom';
import type { ChartColor, ChartConfig, ColorMap } from './GenericPlot';

import CustomPropTypes from '../CustomPropTypes';
import ViewTypeContext from '../contexts/ViewTypeContext';

export type Props = {
  config: AggregationWidgetConfig,
  chartData: any,
  currentQuery: Query,
  effectiveTimerange: {
    from: string,
    to: string,
  },
  getChartColor?: (Array<ChartConfig>, string) => ?string,
  height?: number;
  setChartColor?: (ChartConfig, ColorMap) => ChartColor,
  plotLayout?: any,
  onZoom: (Query, string, string, ?ViewType) => boolean,
};

const yLegendPosition = (containerHeight: number) => {
  if (containerHeight < 150) {
    return -0.6;
  }

  if (containerHeight < 400) {
    return -0.2;
  }

  return -0.14;
};

const XYPlot = ({
  config,
  chartData,
  currentQuery,
  effectiveTimerange,
  getChartColor,
  setChartColor,
  height,
  plotLayout = {},
  onZoom = OnZoom,
}: Props) => {
  const currentUser = useContext(CurrentUserContext);
  const timezone = currentUser?.timezone ?? AppConfig.rootTimeZone();
  const yaxis = { fixedrange: true, rangemode: 'tozero', tickformat: ',g' };
  const defaultLayout: {
    yaxis: { fixedrange?: boolean},
    legend?: {y?: number},
  } = { yaxis };

  if (height) {
    defaultLayout.legend = { y: yLegendPosition(height) };
  }

  const layout = merge({}, defaultLayout, plotLayout);
  const viewType = useContext(ViewTypeContext);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const _onZoom = useCallback(config.isTimeline
    ? (from, to) => onZoom(currentQuery, from, to, viewType)
    : () => true, [config.isTimeline, onZoom]);

  if (config.isTimeline && effectiveTimerange) {
    const normalizedFrom = moment.tz(effectiveTimerange.from, timezone).format();
    const normalizedTo = moment.tz(effectiveTimerange.to, timezone).format();

    layout.xaxis = {
      range: [normalizedFrom, normalizedTo],
      type: 'date',
    };
  } else {
    layout.xaxis = {
      fixedrange: true,
      /* disable plotly sorting by setting the type of the xaxis to category */
      type: config.sort.length > 0 ? 'category' : undefined,
    };
  }

  return (
    <GenericPlot chartData={chartData}
                 layout={layout}
                 onZoom={_onZoom}
                 getChartColor={getChartColor}
                 setChartColor={setChartColor} />
  );
};

XYPlot.propTypes = {
  chartData: PropTypes.array.isRequired,
  config: CustomPropTypes.instanceOf(AggregationWidgetConfig).isRequired,
  currentQuery: CustomPropTypes.instanceOf(Query).isRequired,
  effectiveTimerange: PropTypes.shape({
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
  }),
  plotLayout: PropTypes.object,
  getChartColor: PropTypes.func,
  setChartColor: PropTypes.func,
  onZoom: PropTypes.func,
};

XYPlot.defaultProps = {
  plotLayout: {},
  getChartColor: undefined,
  height: undefined,
  setChartColor: undefined,
  effectiveTimerange: undefined,
  onZoom: OnZoom,
};

export default connect(XYPlot, { currentQuery: CurrentQueryStore }, ({ currentQuery }) => ({ currentQuery }));
