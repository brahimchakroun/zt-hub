MERGE ZT_PERMISSION AS target
USING (VALUES
    (N'DASHBOARD_VIEW', N'Consulter le tableau de bord', N'dashboard', 10),
    (N'USERS_READ', N'Consulter les utilisateurs', N'administration.users', 20),
    (N'USERS_CREATE', N'Créer un utilisateur', N'administration.users', 21),
    (N'USERS_UPDATE', N'Modifier un utilisateur', N'administration.users', 22),
    (N'USERS_DELETE', N'Supprimer un utilisateur', N'administration.users', 23),
    (N'ROLES_READ', N'Consulter les rôles', N'administration.roles', 30),
    (N'ROLES_MANAGE', N'Gérer les rôles', N'administration.roles', 31),
    (N'PERMISSIONS_READ', N'Consulter les permissions', N'administration.permissions', 40),
    (N'PERMISSIONS_MANAGE', N'Gérer les permissions', N'administration.permissions', 41),
    (N'SETTINGS_READ', N'Consulter les paramètres', N'administration.settings', 50),
    (N'SETTINGS_UPDATE', N'Modifier les paramètres', N'administration.settings', 51),
    (N'LIFE_READ', N'Consulter les contrats vie', N'assurance.vie', 60),
    (N'LIFE_CALCULATE', N'Calculer une simulation vie', N'assurance.vie', 61),
    (N'MOTHMER_READ', N'Consulter les contrats Mothmer', N'assurance.vie', 62),
    (N'AUTO_READ', N'Consulter les contrats automobile', N'assurance.auto', 70),
    (N'HEALTH_READ', N'Consulter les contrats maladie', N'assurance.maladie', 80),
    (N'TRANSPORT_READ', N'Consulter les contrats transport', N'assurance.transport', 90),
    (N'MISC_READ', N'Consulter les assurances diverses', N'assurance.divers', 100),
    (N'FIRE_READ', N'Consulter les contrats incendie', N'assurance.incendie', 110),
    (N'BORDEREAU_READ', N'Consulter les bordereaux', N'bureau-ordre', 120),
    (N'BORDEREAU_MANAGE', N'Gérer les bordereaux', N'bureau-ordre', 121),
    (N'REINSURANCE_READ', N'Consulter la réassurance', N'reassurance', 130),
    (N'CLAIMS_READ', N'Consulter les sinistres', N'sinistres', 140),
    (N'PARTNERS_READ', N'Consulter les partenaires', N'partenaires', 150),
    (N'REPORTING_READ', N'Consulter les rapports', N'reporting', 160),
    (N'DOCUMENTS_READ', N'Consulter les documents', N'documents', 170),
    (N'DOCUMENTS_MANAGE', N'Gérer les documents', N'documents', 171),
    (N'PROFILE_READ', N'Consulter son profil', N'auth', 180),
    (N'PASSWORD_CHANGE', N'Modifier son mot de passe', N'auth', 181)
) AS source (permission_code, label, group_name, display_order)
ON target.permission_code = source.permission_code
WHEN NOT MATCHED THEN
    INSERT (permission_code, label, group_name, display_order, active)
    VALUES (source.permission_code, source.label, source.group_name, source.display_order, 1);