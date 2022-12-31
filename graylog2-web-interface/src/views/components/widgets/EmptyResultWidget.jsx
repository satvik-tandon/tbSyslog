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
import React from 'react';

import { DocumentationLink } from 'components/support';
import { Icon } from 'components/common';
import DocsHelper from 'util/DocsHelper';
import PortaledPopover from 'views/components/common/PortaledPopover';

import styles from './MessageWidgets.css';

const popover = (
  <span>
    
  </span>
);

const EmptyResultWidget = () => (
  <div className={styles.spinnerContainer}>
    <Icon name="times" size="3x" className={styles.iconMargin} />
    <div>
      <strong>
        Your search returned no results, try changing the used time range or the search query.{' '}
      </strong>

      <br />
    </div>
  </div>
);

EmptyResultWidget.propTypes = {};

export default EmptyResultWidget;
