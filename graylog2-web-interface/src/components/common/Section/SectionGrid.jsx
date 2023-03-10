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
import styled, { type StyledComponent, css } from 'styled-components';

import { type ThemeInterface } from 'theme';

const SectionGrid: StyledComponent<{}, ThemeInterface, HTMLDivElement> = styled.div(({ theme }) => css`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-column-gap: 40px;

  @media (max-width: ${theme.breakpoints.max.md}) {
    grid-template-columns: 1fr;
  }
`);

export default SectionGrid;
