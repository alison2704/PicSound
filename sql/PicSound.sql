---------------------------------------------------------------
-- CREACIÓN COMPLETA DE LA BASE DE DATOS PICSOUNDDB (CORREGIDA)
-- Evita errores de "multiple cascade paths"
-- Solo enlaces externos (no archivos)
---------------------------------------------------------------

-- 1️ Crear la base de datos
IF DB_ID('PicsoundDB') IS NULL
    CREATE DATABASE PicsoundDB;
GO
USE PicsoundDB;
GO

---------------------------------------------------------------
-- 2️ Tabla Roles
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
-- 3️ Tabla Users
---------------------------------------------------------------
CREATE TABLE Users
(
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(100) NOT NULL,
    Email NVARCHAR(200) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(256) NOT NULL,
    RoleID INT NOT NULL DEFAULT 1 REFERENCES Roles(RoleID),
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

---------------------------------------------------------------
-- 4️ Tabla Images (fotos)
---------------------------------------------------------------
CREATE TABLE Images
(
    ImageID INT IDENTITY(1,1) PRIMARY KEY,
    UserID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    Title NVARCHAR(250) NULL,
    Description NVARCHAR(MAX) NULL,
    ImageUrl NVARCHAR(500) NOT NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

---------------------------------------------------------------
-- 5️ Tabla Songs (solo enlaces)
---------------------------------------------------------------
CREATE TABLE Songs
(
    SongID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(250) NOT NULL,
    ExternalUrl NVARCHAR(500) NOT NULL,
    CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME()
);
GO

---------------------------------------------------------------
-- 6️ Tabla ImageSongs (asocia hasta 3 canciones por imagen)
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
-- 7️ Tabla Likes (relación Usuario - Imagen)
-- ❗ ON DELETE NO ACTION en ImageID para evitar múltiples cascadas
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
-- 8️ Tabla Comments (comentarios)
-- ❗ ON DELETE NO ACTION en ImageID para evitar múltiples cascadas
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
-- 9️ Tabla SongVotes (votos de canciones)
-- ❗ ON DELETE NO ACTION en ImageID para evitar múltiples cascadas
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
-- 10️ Datos iniciales
---------------------------------------------------------------
INSERT INTO Users
    (Username, Email, PasswordHash, RoleID)
VALUES
    ('admin', 'admin@picsound.com', 'HASH_ADMIN_TEMP', 2);
GO

---------------------------------------------------------------
--  FIN DEL SCRIPT CORREGIDO
---------------------------------------------------------------


CREATE LOGIN picsound_user WITH PASSWORD = 'Picsound123*';
GO
USE PicsoundDB;
CREATE USER picsound_user FOR LOGIN picsound_user;
ALTER ROLE db_owner ADD MEMBER picsound_user;
