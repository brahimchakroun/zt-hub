MERGE ZT_ROLE_PAGE AS target
USING (
    SELECT CAST(N'ADMIN' AS NVARCHAR(64)) AS role_code, page_code
    FROM ZT_PAGE WHERE active = 1
    UNION ALL
    SELECT role_code, page_code FROM (VALUES
        (N'USER', N'dashboard'),
        (N'USER', N'assurance.vie'),
        (N'USER', N'assurance.vie.calculator'),
        (N'USER', N'assurance.vie.mothmer'),
        (N'USER', N'assurance.auto'),
        (N'USER', N'assurance.maladie'),
        (N'USER', N'assurance.transport'),
        (N'USER', N'assurance.divers'),
        (N'USER', N'assurance.incendie'),
        (N'USER', N'sinistres'),
        (N'USER', N'partenaires'),
        (N'USER', N'documents'),
        (N'USER', N'auth.profile'),
        (N'USER', N'auth.change-password'),
        (N'BUREAU_ORDRE', N'dashboard'),
        (N'BUREAU_ORDRE', N'bureau-ordre'),
        (N'BUREAU_ORDRE', N'bureau-ordre.decharge-bordereaux'),
        (N'BUREAU_ORDRE', N'documents'),
        (N'BUREAU_ORDRE', N'reporting'),
        (N'BUREAU_ORDRE', N'auth.profile'),
        (N'BUREAU_ORDRE', N'auth.change-password')
    ) AS role_pages (role_code, page_code)
) AS source
ON target.role_code = source.role_code AND target.page_code = source.page_code
WHEN NOT MATCHED THEN
    INSERT (role_code, page_code) VALUES (source.role_code, source.page_code);

MERGE ZT_ROLE_PERMISSION AS target
USING (
    SELECT CAST(N'ADMIN' AS NVARCHAR(64)) AS role_code, permission_code
    FROM ZT_PERMISSION WHERE active = 1
    UNION ALL
    SELECT role_code, permission_code FROM (VALUES
        (N'USER', N'DASHBOARD_VIEW'),
        (N'USER', N'LIFE_READ'),
        (N'USER', N'LIFE_CALCULATE'),
        (N'USER', N'MOTHMER_READ'),
        (N'USER', N'AUTO_READ'),
        (N'USER', N'HEALTH_READ'),
        (N'USER', N'TRANSPORT_READ'),
        (N'USER', N'MISC_READ'),
        (N'USER', N'FIRE_READ'),
        (N'USER', N'CLAIMS_READ'),
        (N'USER', N'PARTNERS_READ'),
        (N'USER', N'DOCUMENTS_READ'),
        (N'USER', N'PROFILE_READ'),
        (N'USER', N'PASSWORD_CHANGE'),
        (N'BUREAU_ORDRE', N'DASHBOARD_VIEW'),
        (N'BUREAU_ORDRE', N'BORDEREAU_READ'),
        (N'BUREAU_ORDRE', N'BORDEREAU_MANAGE'),
        (N'BUREAU_ORDRE', N'DOCUMENTS_READ'),
        (N'BUREAU_ORDRE', N'REPORTING_READ'),
        (N'BUREAU_ORDRE', N'PROFILE_READ'),
        (N'BUREAU_ORDRE', N'PASSWORD_CHANGE')
    ) AS role_permissions (role_code, permission_code)
) AS source
ON target.role_code = source.role_code AND target.permission_code = source.permission_code
WHEN NOT MATCHED THEN
    INSERT (role_code, permission_code) VALUES (source.role_code, source.permission_code);