create unique index if not exists account_provider_account_unique
  on "account" ("providerId", "accountId");
