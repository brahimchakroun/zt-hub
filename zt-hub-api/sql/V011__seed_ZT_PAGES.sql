MERGE ZT_PAGE AS target
USING (VALUES
    (N'dashboard', N'Tableau de bord', N'general', N'dashboard', 10, N'Accueil de l’application'),
    (N'administration.users', N'Utilisateurs', N'administration', N'users', 20, N'Gestion des utilisateurs'),
    (N'administration.roles', N'Rôles', N'administration', N'shield', 30, N'Gestion des rôles'),
    (N'administration.permissions', N'Permissions', N'administration', N'key', 40, N'Gestion des permissions'),
    (N'administration.settings', N'Paramètres', N'administration', N'settings', 50, N'Paramètres de l’application'),
    (N'assurance.vie', N'Assurance vie', N'assurance.vie', N'heart', 60, N'Gestion de l’assurance vie'),
    (N'assurance.vie.calculator', N'Simulateur vie', N'assurance.vie', N'calculate', 70, N'Simulation des produits vie'),
    (N'assurance.vie.mothmer', N'Mothmer', N'assurance.vie', N'savings', 80, N'Gestion du produit Mothmer'),
    (N'assurance.auto', N'Assurance automobile', N'assurance', N'car', 90, N'Gestion de l’assurance automobile'),
    (N'assurance.maladie', N'Assurance maladie', N'assurance', N'medical_services', 100, N'Gestion de l’assurance maladie'),
    (N'assurance.transport', N'Assurance transport', N'assurance', N'local_shipping', 110, N'Gestion de l’assurance transport'),
    (N'assurance.divers', N'Assurances diverses', N'assurance', N'category', 120, N'Gestion des assurances diverses'),
    (N'assurance.incendie', N'Assurance incendie', N'assurance', N'fire', 130, N'Gestion de l’assurance incendie'),
    (N'bureau-ordre', N'Bureau d’ordre', N'bureau-ordre', N'inbox', 140, N'Gestion du bureau d’ordre'),
    (N'bureau-ordre.decharge-bordereaux', N'Décharge des bordereaux', N'bureau-ordre', N'receipt_long', 150, N'Décharge et suivi des bordereaux'),
    (N'reassurance', N'Réassurance', N'reassurance', N'account_tree', 160, N'Gestion de la réassurance'),
    (N'sinistres', N'Sinistres', N'sinistres', N'report_problem', 170, N'Gestion des sinistres'),
    (N'partenaires', N'Partenaires', N'partenaires', N'handshake', 180, N'Gestion des partenaires'),
    (N'reporting', N'Rapports', N'reporting', N'analytics', 190, N'Consultation des rapports'),
    (N'documents', N'Documents', N'documents', N'description', 200, N'Gestion des documents'),
    (N'auth.profile', N'Mon profil', N'auth', N'person', 210, N'Consultation du profil personnel'),
    (N'auth.change-password', N'Modification du mot de passe', N'auth', N'lock', 220, N'Modification du mot de passe personnel')
) AS source (page_code, label, group_name, icon, display_order, description)
ON target.page_code = source.page_code
WHEN NOT MATCHED THEN
    INSERT (page_code, label, group_name, icon, display_order, active, description)
    VALUES (source.page_code, source.label, source.group_name, source.icon, source.display_order, 1, source.description);