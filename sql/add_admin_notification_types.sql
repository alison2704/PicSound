-- Script para agregar tipos de notificaciones de administrador
-- Permite que el sistema envíe notificaciones cuando el admin elimina contenido
USE PicsoundDB;
GO

-- Eliminar la restricción CHECK existente
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

-- Agregar nueva restricción CHECK con los tipos adicionales
ALTER TABLE Notifications
ADD CONSTRAINT CK_Notification_Type 
CHECK (Type IN ('like', 'comment', 'vote', 'admin_delete_post', 'admin_delete_comment'));
GO

PRINT 'Nueva restricción CHECK agregada con tipos de notificaciones de admin';
GO
