/*===============================================================
  PICSOUNDDB - SCRIPT COMPLETO CORREGIDO Y REEJECUTABLE
===============================================================*/

---------------------------------------------------------------
-- 1️  BORRAR TABLAS SI EXISTEN (ORDEN CORRECTO)
---------------------------------------------------------------
IF DB_ID('PicsoundDB') IS NOT NULL
BEGIN
    USE PicsoundDB;

    IF OBJECT_ID('dbo.Notifications', 'U') IS NOT NULL DROP TABLE dbo.Notifications;
    IF OBJECT_ID('dbo.SongVotes',  'U') IS NOT NULL DROP TABLE dbo.SongVotes;
    IF OBJECT_ID('dbo.Comments',   'U') IS NOT NULL DROP TABLE dbo.Comments;
    IF OBJECT_ID('dbo.Likes',      'U') IS NOT NULL DROP TABLE dbo.Likes;
    IF OBJECT_ID('dbo.ImageSongs', 'U') IS NOT NULL DROP TABLE dbo.ImageSongs;
    IF OBJECT_ID('dbo.Images',     'U') IS NOT NULL DROP TABLE dbo.Images;
    IF OBJECT_ID('dbo.Categories',  'U') IS NOT NULL DROP TABLE dbo.Categories;
    -- NUEVO
    IF OBJECT_ID('dbo.Songs',      'U') IS NOT NULL DROP TABLE dbo.Songs;
    IF OBJECT_ID('dbo.Users',      'U') IS NOT NULL DROP TABLE dbo.Users;
    IF OBJECT_ID('dbo.Roles',      'U') IS NOT NULL DROP TABLE dbo.Roles;
END
GO

---------------------------------------------------------------
-- 2️ CREAR BD SI NO EXISTE
---------------------------------------------------------------
IF DB_ID('PicsoundDB') IS NULL
    CREATE DATABASE PicsoundDB;
GO

USE PicsoundDB;
GO

---------------------------------------------------------------
-- 3️ Tabla Roles
---------------------------------------------------------------
CREATE TABLE Roles
(
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO Roles
    (Name)
VALUES
    ('user'),
    ('admin');
GO

---------------------------------------------------------------
--NUEVA Tabla Categories
---------------------------------------------------------------
CREATE TABLE Categories
(
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL UNIQUE
);
-- Insertar las categorías que usas en index.html
INSERT INTO Categories
    (Name)
VALUES
    ('Paisajes'),
    ('Moda'),
    ('Viajes'),
    ('Urbana'),
    ('Minimalista'),
    ('Naturaleza');
GO

---------------------------------------------------------------
-- 4️ Tabla Users
---------------------------------------------------------------
CREATE TABLE Users
(
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL UNIQUE,
    Email NVARCHAR(200) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NOT NULL,
    RoleID INT NOT NULL DEFAULT 1 REFERENCES Roles(RoleID),
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

---------------------------------------------------------------
-- 5️ Tabla Images
---------------------------------------------------------------
CREATE TABLE Images
(
    ImageID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    CategoryID INT NOT NULL REFERENCES Categories(CategoryID),
    Description NVARCHAR(MAX) NULL,
    ImageURL NVARCHAR(500) NOT NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

---------------------------------------------------------------
-- 6️ Tabla Songs
---------------------------------------------------------------
CREATE TABLE Songs
(
    SongID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(250) NOT NULL,
    ExternalURL NVARCHAR(500) NOT NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

---------------------------------------------------------------
-- 7️ Tabla ImageSongs (hasta 3 canciones por imagen)
---------------------------------------------------------------
CREATE TABLE ImageSongs
(
    ImageSongID INT IDENTITY(1,1) PRIMARY KEY,
    ImageID INT NOT NULL REFERENCES Images(ImageID) ON DELETE CASCADE,
    SongID INT NOT NULL REFERENCES Songs(SongID) ON DELETE CASCADE,
    Position TINYINT NOT NULL CHECK (Position BETWEEN 1 AND 3),
    CONSTRAINT UQ_Image_Pos UNIQUE (ImageID, Position),
    CONSTRAINT UQ_Image_Song UNIQUE (ImageID, SongID)
);
GO

---------------------------------------------------------------
-- 8️ Tabla Likes
-- (NO ACTION en ImageID para evitar múltiples cascadas)
---------------------------------------------------------------
CREATE TABLE Likes
(
    LikeID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    ImageID INT NOT NULL REFERENCES Images(ImageID) ON DELETE NO ACTION,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_UserImageLike UNIQUE (UserID, ImageID)
);
GO

---------------------------------------------------------------
-- 9️ Tabla Comments
---------------------------------------------------------------
CREATE TABLE Comments
(
    CommentID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NULL REFERENCES Users(UserID) ON DELETE SET NULL,
    ImageID INT NOT NULL REFERENCES Images(ImageID) ON DELETE NO ACTION,
    Content NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

---------------------------------------------------------------
-- 10️ Tabla SongVotes (CORRECTA)
---------------------------------------------------------------
CREATE TABLE SongVotes
(
    SongVoteID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    ImageID INT NOT NULL REFERENCES Images(ImageID) ON DELETE NO ACTION,
    SongID INT NOT NULL REFERENCES Songs(SongID) ON DELETE CASCADE,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_UserImageSongVote UNIQUE (UserID, ImageID, SongID)
);
GO

---------------------------------------------------------------
-- 11️ Tabla Notifications
---------------------------------------------------------------
CREATE TABLE Notifications
(
    NotificationID INT IDENTITY(1,1) PRIMARY KEY,
    ReceiverID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    SenderID INT NOT NULL REFERENCES Users(UserID) ON DELETE NO ACTION,
    ImageID INT NULL REFERENCES Images(ImageID) ON DELETE NO ACTION,
    Type NVARCHAR(30) NOT NULL CHECK (Type IN ('like', 'comment', 'vote', 'admin_delete_post', 'admin_delete_comment')),
    CommentText NVARCHAR(MAX) NULL,
    IsRead BIT NOT NULL DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

---------------------------------------------------------------
-- 12️ Insertar admin SOLO si no existe
---------------------------------------------------------------
IF NOT EXISTS (SELECT 1
FROM Users
WHERE Email = 'admin@picsound.com')
BEGIN
    INSERT INTO Users
        (Username, Email, PasswordHash, RoleID)
    VALUES
        (
            'admin',
            'admin@picsound.com',
            '$2a$10$kOIRU1Lb1Q0k44FtmGjgAey.VMsUy0DDYfzECF6O.IeIH9ll620Hi',
            2
    );
END
GO

---------------------------------------------------------------
-- 13️ Crear LOGIN solo si NO existe
---------------------------------------------------------------
IF NOT EXISTS (SELECT 1
FROM sys.server_principals
WHERE name = 'picsound_user')
    CREATE LOGIN picsound_user WITH PASSWORD = 'Picsound123*';
GO

USE PicsoundDB;
GO

---------------------------------------------------------------
-- 14️ Crear USER solo si NO existe
---------------------------------------------------------------
IF NOT EXISTS (SELECT 1
FROM sys.database_principals
WHERE name = 'picsound_user')
    CREATE USER picsound_user FOR LOGIN picsound_user;
GO

---------------------------------------------------------------
-- 15️ Agregar rol si no existe
---------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1
FROM sys.database_role_members drm
    JOIN sys.database_principals dp ON drm.member_principal_id = dp.principal_id
    JOIN sys.database_principals rp ON drm.role_principal_id = rp.principal_id
WHERE dp.name = 'picsound_user'
    AND rp.name = 'db_owner'
)
    ALTER ROLE db_owner ADD MEMBER picsound_user;
GO

/*===============================================================
  FIN DEL SCRIPT
===============================================================*/

