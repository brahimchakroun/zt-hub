MERGE ZT_ROLE AS target
USING (VALUES
    (N'ADMIN', N'Administrateur'),
    (N'USER', N'Utilisateur'),
    (N'BUREAU_ORDRE', N'Bureau d''ordre')
) AS source (code, label)
ON target.code = source.code
WHEN NOT MATCHED THEN
    INSERT (code, label) VALUES (source.code, source.label);

MERGE ZT_USER AS target
USING (VALUES
    (N'admin', N'admin@zt.local', N'Admin', N'Zitouna', N'$2a$12$yUsXPexD5n2fsyVNewlkYuudipB3d.SAlaUiDGeX44Ke/53j/GoY2', N'["ADMIN"]'),
    (N'user', N'user@zt.local', N'User', N'Zitouna', N'$2a$12$Oh/yvdu7D6BjCF3wvegli.y7Xm.K8NDlagFuumwKmf2c5HWBaudui', N'["USER"]'),
    (N'bo', N'bo@zt.local', N'Bureau', N'Ordre', N'$2a$12$gE7zptNorYAoSOfaTTsoTOTs6lH1GS.kM5nok1jnshGp08YsETZSC', N'["BUREAU_ORDRE"]')
) AS source (username, email, first_name, last_name, password_hash, role_codes)
ON target.username = source.username
WHEN NOT MATCHED THEN
    INSERT (username, email, first_name, last_name, password_hash, role_codes, status)
    VALUES (source.username, source.email, source.first_name, source.last_name,
            source.password_hash, source.role_codes, N'ACTIVE');
