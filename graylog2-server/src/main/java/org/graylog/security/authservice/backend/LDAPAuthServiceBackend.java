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
package org.graylog.security.authservice.backend;

import com.google.common.collect.ImmutableMap;
import com.google.inject.assistedinject.Assisted;
import com.unboundid.ldap.sdk.LDAPConnection;
import com.unboundid.ldap.sdk.LDAPException;
import org.graylog.security.authservice.AuthServiceBackend;
import org.graylog.security.authservice.AuthServiceBackendDTO;
import org.graylog.security.authservice.AuthServiceCredentials;
import org.graylog.security.authservice.AuthenticationDetails;
import org.graylog.security.authservice.ProvisionerService;
import org.graylog.security.authservice.UserDetails;
import org.graylog.security.authservice.ldap.LDAPUser;
import org.graylog.security.authservice.ldap.UnboundLDAPConfig;
import org.graylog.security.authservice.ldap.UnboundLDAPConnector;
import org.graylog.security.authservice.test.AuthServiceBackendTestResult;
import org.graylog2.security.encryption.EncryptedValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nullable;
import javax.inject.Inject;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class LDAPAuthServiceBackend implements AuthServiceBackend {
    public static final String TYPE_NAME = "ldap";

    private static final Logger LOG = LoggerFactory.getLogger(LDAPAuthServiceBackend.class);
    private final LDAPAuthServiceBackendConfig config;

    public interface Factory extends AuthServiceBackend.Factory<LDAPAuthServiceBackend> {
        @Override
        LDAPAuthServiceBackend create(AuthServiceBackendDTO backend);
    }

    private final UnboundLDAPConnector ldapConnector;
    private final AuthServiceBackendDTO backend;

    @Inject
    public LDAPAuthServiceBackend(UnboundLDAPConnector ldapConnector,
                                  @Assisted AuthServiceBackendDTO backend) {
        this.ldapConnector = ldapConnector;
        this.backend = backend;
        this.config = (LDAPAuthServiceBackendConfig) backend.config();
    }

    @Override
    public Optional<AuthenticationDetails> authenticateAndProvision(AuthServiceCredentials authCredentials, ProvisionerService provisionerService) {
        try (final LDAPConnection connection = ldapConnector.connect(config.getLDAPConnectorConfig())) {
            if (connection == null) {
                return Optional.empty();
            }

            final Optional<LDAPUser> optionalUser = findUser(connection, authCredentials);
            if (!optionalUser.isPresent()) {
                LOG.debug("User <{}> not found in LDAP", authCredentials.username());
                return Optional.empty();
            }

            final LDAPUser userEntry = optionalUser.get();

            if (!authCredentials.isAuthenticated()) {
                if (!isAuthenticated(connection, userEntry, authCredentials)) {
                    LOG.debug("Invalid credentials for user <{}> (DN: {})", authCredentials.username(), userEntry.dn());
                    return Optional.empty();
                }
            }

            final UserDetails userDetails = provisionerService.provision(provisionerService.newDetails(this)
                    .authServiceType(backendType())
                    .authServiceId(backendId())
                    .accountIsEnabled(true)
                    .base64AuthServiceUid(userEntry.base64UniqueId())
                    .username(userEntry.username())
                    .fullName(userEntry.fullName())
                    .email(userEntry.email())
                    .defaultRoles(backend.defaultRoles())
                    .build());

            return Optional.of(AuthenticationDetails.builder().userDetails(userDetails).build());
        } catch (GeneralSecurityException e) {
            LOG.error("Error setting up TLS connection", e);
            return Optional.empty();
        } catch (LDAPException e) {
            LOG.error("LDAP error", e);
            return Optional.empty();
        }
    }

    private boolean isAuthenticated(LDAPConnection connection,
                                    LDAPUser user,
                                    AuthServiceCredentials authCredentials) throws LDAPException {
        return ldapConnector.authenticate(
                connection,
                user.dn(),
                authCredentials.password()
        );
    }

    private Optional<LDAPUser> findUser(LDAPConnection connection, AuthServiceCredentials authCredentials) throws LDAPException {
        final UnboundLDAPConfig searchConfig = UnboundLDAPConfig.builder()
                .userSearchBase(config.userSearchBase())
                .userSearchPattern(config.userSearchPattern())
                .userUniqueIdAttribute(config.userUniqueIdAttribute())
                .userNameAttribute(config.userNameAttribute())
                .userFullNameAttribute(config.userFullNameAttribute())
                .build();

        return ldapConnector.searchUserByPrincipal(connection, searchConfig, authCredentials.username());
    }

    @Override
    public String backendType() {
        return TYPE_NAME;
    }

    @Override
    public String backendId() {
        return backend.id();
    }

    @Override
    public String backendTitle() {
        return backend.title();
    }

    @Override
    public AuthServiceBackendDTO prepareConfigUpdate(AuthServiceBackendDTO existingBackend, AuthServiceBackendDTO newBackend) {
        final LDAPAuthServiceBackendConfig newConfig = (LDAPAuthServiceBackendConfig) newBackend.config();

        if (newConfig.systemUserPassword().isDeleteValue()) {
            // If the system user password should be deleted, use an unset value
            return newBackend.toBuilder()
                    .config(newConfig.toBuilder()
                            .systemUserPassword(EncryptedValue.createUnset())
                            .build())
                    .build();
        }
        if (newConfig.systemUserPassword().isKeepValue()) {
            // If the system user password should be kept, use the value from the existing config
            final LDAPAuthServiceBackendConfig existingConfig = (LDAPAuthServiceBackendConfig) existingBackend.config();
            return newBackend.toBuilder()
                    .config(newConfig.toBuilder()
                            .systemUserPassword(existingConfig.systemUserPassword())
                            .build())
                    .build();
        }

        return newBackend;
    }

    @Override
    public AuthServiceBackendTestResult testConnection(@Nullable AuthServiceBackendDTO existingBackendConfig) {
        final LDAPAuthServiceBackendConfig testConfig = buildTestConfig(existingBackendConfig);

        try (final LDAPConnection connection = ldapConnector.connect(testConfig.getLDAPConnectorConfig())) {
            if (connection == null) {
                return AuthServiceBackendTestResult.createFailure("Couldn't establish connection to " + testConfig.servers());
            }
            return AuthServiceBackendTestResult.createSuccess("Successfully connected to " + testConfig.servers());
        } catch (Exception e) {
            return AuthServiceBackendTestResult.createFailure(
                    "Couldn't establish connection to " + testConfig.servers(),
                    Collections.singletonList(e.getMessage())
            );
        }
    }

    @Override
    public AuthServiceBackendTestResult testLogin(AuthServiceCredentials credentials, @Nullable AuthServiceBackendDTO existingBackendConfig) {
        final LDAPAuthServiceBackendConfig testConfig = buildTestConfig(existingBackendConfig);

        try (final LDAPConnection connection = ldapConnector.connect(testConfig.getLDAPConnectorConfig())) {
            if (connection == null) {
                return AuthServiceBackendTestResult.createFailure("Couldn't establish connection to " + testConfig.servers());
            }
            final Optional<LDAPUser> user = findUser(connection, credentials);

            if (!user.isPresent()) {
                return AuthServiceBackendTestResult.createFailure(
                        "User <" + credentials.username() + "> doesn't exist",
                        createTestResult(testConfig, false, false, null)
                );
            }

            if (isAuthenticated(connection, user.get(), credentials)) {
                return AuthServiceBackendTestResult.createSuccess(
                        "Successfully logged in <" + credentials.username() + "> into " + testConfig.servers(),
                        createTestResult(testConfig, true, true, user.get())
                );
            }
            return AuthServiceBackendTestResult.createFailure(
                    "Login for user <" + credentials.username() + "> failed",
                    createTestResult(testConfig, true, false, user.get())
            );
        } catch (Exception e) {
            return AuthServiceBackendTestResult.createFailure(
                    "Couldn't test user login on " + testConfig.servers(),
                    Collections.singletonList(e.getMessage())
            );
        }
    }

    private LDAPAuthServiceBackendConfig buildTestConfig(@Nullable AuthServiceBackendDTO existingBackendConfig) {
        final LDAPAuthServiceBackendConfig.Builder newConfigBuilder = config.toBuilder();

        // If the existing password should be kept and we got an existing config, use the password of the
        // existing config for the connection check. This is needed to make connection tests of existing backends work
        // because the UI doesn't have access to the existing password.
        if (config.systemUserPassword().isKeepValue() && existingBackendConfig != null) {
            final LDAPAuthServiceBackendConfig existingConfig = (LDAPAuthServiceBackendConfig) existingBackendConfig.config();
            newConfigBuilder.systemUserPassword(existingConfig.systemUserPassword());
        }

        return newConfigBuilder.build();
    }

    private Map<String, Object> createTestResult(LDAPAuthServiceBackendConfig config,
                                                 boolean userExists,
                                                 boolean loginSuccess,
                                                 @Nullable LDAPUser user) {
        final ImmutableMap.Builder<String, Object> userDetails = ImmutableMap.<String, Object>builder()
                .put("user_exists", userExists)
                .put("login_success", loginSuccess);

        if (user != null) {
            // Use regular HashMap to allow duplicates. Users might use the same attribute for name and full name.
            // See: https://github.com/Graylog2/graylog2-server/issues/10069
            final Map<String, String> attributes = new HashMap<>();

            attributes.put("dn", user.dn());
            // Use a special key for the unique ID attribute. If users use something like "uid" for the unique ID,
            // it might be confusing to see a base64 encoded value instead of the plain text one.
            attributes.put("unique_id (" + config.userUniqueIdAttribute() + ")", user.base64UniqueId());
            attributes.put(config.userNameAttribute(), user.username());
            attributes.put(config.userFullNameAttribute(), user.fullName());
            attributes.put("email", user.email());

            userDetails.put("user_details", ImmutableMap.copyOf(attributes));
        } else {
            userDetails.put("user_details", ImmutableMap.of());
        }

        return userDetails.build();
    }
}
