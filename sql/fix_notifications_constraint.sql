USE PicsoundDB;
GO

/* =====================================================
   1. Eliminar CHECK anterior del tipo de notificación
   ===================================================== */
IF EXISTS (
    SELECT 1 
    FROM sys.check_constraints 
    WHERE parent_object_id = OBJECT_ID('dbo.Notifications') 
      AND name LIKE '%CK%Type%'
)
BEGIN
    DECLARE @ConstraintName NVARCHAR(200);

    SELECT @ConstraintName = name
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.Notifications')
      AND name LIKE '%CK%Type%';

    DECLARE @SQL NVARCHAR(MAX);
    SET @SQL = 'ALTER TABLE Notifications DROP CONSTRAINT ' + QUOTENAME(@ConstraintName);
    EXEC sp_executesql @SQL;

    PRINT 'Restricción CHECK anterior eliminada: ' + @ConstraintName;
END
GO


/* =====================================================
   2. Eliminar restricción UNIQUE que impide duplicados
   ===================================================== */
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Notification')
BEGIN
    ALTER TABLE Notifications DROP CONSTRAINT UQ_Notification;
    PRINT 'Restricción UQ_Notification eliminada correctamente';
END
ELSE
BEGIN
    PRINT 'La restricción UQ_Notification no existe';
END
GO


/* =====================================================
   3. Crear nueva restricción CHECK con tipos de admin
   ===================================================== */
ALTER TABLE Notifications
ADD CONSTRAINT CK_Notification_Type 
CHECK (Type IN (
    'like', 
    'comment', 
    'vote', 
    'admin_delete_post', 
    'admin_delete_comment'
));
GO

PRINT 'Actualización de notificaciones aplicada correctamente';
GO
