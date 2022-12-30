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

import { LinkContainer } from 'components/graylog/router';
import RolesOverview from 'components/roles/RolesOverview';
import Routes from 'routing/Routes';
import DocsHelper from 'util/DocsHelper';
import { Button, Row, Col, Alert } from 'components/graylog';
import { PageHeader, DocumentTitle, Icon } from 'components/common';
import DocumentationLink from 'components/support/DocumentationLink';

const RolesOverviewPage = () => (
  <DocumentTitle title="Roles Overview">
    <PageHeader title="Roles Overview">
      <span>Overview of tbSyslog&apos;s roles. Roles allow granting capabilities to users, like creating dashboards or event definitions.</span>


      <LinkContainer to={Routes.SYSTEM.AUTHZROLES.OVERVIEW}>
        <Button bsStyle="info">Roles Overview</Button>
      </LinkContainer>
    </PageHeader>


    <RolesOverview />
  </DocumentTitle>
);

export default RolesOverviewPage;
