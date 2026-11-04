MERGE ZT_ROLE AS target
USING (VALUES
    (N'ADMIN', N'Administrateur', N'Accès complet à la configuration et aux modules.', 10),
    (N'USER', N'Utilisateur', N'Accès aux fonctionnalités métier autorisées.', 20),
    (N'BUREAU_ORDRE', N'Bureau d’ordre', N'Gestion du courrier et des bordereaux.', 30)
) AS source (code, label, description, display_order)
ON target.code = source.code
WHEN MATCHED AND target.description IS NULL THEN
    UPDATE SET target.description = source.description, target.display_order = source.display_order
WHEN NOT MATCHED THEN
    INSERT (code, label, description, display_order, active)
    VALUES (source.code, source.label, source.description, source.display_order, 1);