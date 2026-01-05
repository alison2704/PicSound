-- Eliminar la restricción UNIQUE que impide notificaciones duplicadas
USE PicsoundDB;
GO

-- Buscar el nombre exacto de la restricción
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
