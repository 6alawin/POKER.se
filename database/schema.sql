
-- PostgreSQL Schema v1


-- card skin

CREATE TABLE card_skin (
    skin_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    asset_url VARCHAR(255)
);

-- table Skin

CREATE TABLE table_skin (
    skin_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    asset_url VARCHAR(500)
);

-- user

CREATE TABLE picture_profile (
    picture_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    asset_url VARCHAR(500)
);

INSERT INTO card_skin (skin_id, name, asset_url)
VALUES ('default_card', 'Default Card', '');

INSERT INTO table_skin (skin_id, name, asset_url)
VALUES ('default_table', 'Default Table', '');

INSERT INTO picture_profile (picture_id, name, asset_url) VALUES
    ('cowboy', 'Cowboy', '/src/assets/picture_profile/cowboy.png'),
    ('pine-tree', 'Pine Tree', '/src/assets/picture_profile/pine-tree.webp'),
    ('cherry-tree', 'Cherry Tree', '/src/assets/picture_profile/cherry-tree.webp'),
    ('ice-fishing', 'Ice Fishing', '/src/assets/picture_profile/ice-fishing.png'),
    ('wizard', 'Wizard', '/src/assets/picture_profile/wizard.png'),
    ('undertaker', 'Undertaker', '/src/assets/picture_profile/undertaker.png'),
    ('plague-doctor', 'Plague Doctor', '/src/assets/picture_profile/plague-doctor.png');

CREATE TABLE "user" (
    uid VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255),
    username VARCHAR(30),
    current_card_skin VARCHAR(255),
    current_table_skin VARCHAR(255),
    picture_id VARCHAR(255),

    CONSTRAINT fk_user_card_skin
        FOREIGN KEY (current_card_skin)
        REFERENCES card_skin(skin_id),

    CONSTRAINT fk_user_table_skin
        FOREIGN KEY (current_table_skin)
        REFERENCES table_skin(skin_id),

    CONSTRAINT fk_user_picture
        FOREIGN KEY (picture_id)
        REFERENCES picture_profile(picture_id)
);

-- game Room

CREATE TABLE game_room (
    table_id VARCHAR(255) PRIMARY KEY,
    host_id VARCHAR(255),
    status VARCHAR(20),
    max_player INTEGER,
    current_player INTEGER,
    created_at TIMESTAMP,

    CONSTRAINT fk_game_room_host
        FOREIGN KEY (host_id)
        REFERENCES "user"(uid)
);

-- room Player

CREATE TABLE roomplayer (
    table_id VARCHAR(255),
    pk_fk VARCHAR(255),
    uid VARCHAR(50),
    seat_number INTEGER,
    is_bot BOOLEAN,
    chip_stack INTEGER,
    joined_at TIMESTAMP,

    CONSTRAINT fk_roomplayer_table
        FOREIGN KEY (table_id)
        REFERENCES game_room(table_id),

    CONSTRAINT fk_roomplayer_user
        FOREIGN KEY (uid)
        REFERENCES "user"(uid)
);

-- match History

CREATE TABLE match_history (
    history_id VARCHAR(255) PRIMARY KEY,
    uid VARCHAR(50),
    table_id VARCHAR(255),
    result VARCHAR(255),
    pot_amount INTEGER,
    chip_change INTEGER,
    played_at TIMESTAMP,

    CONSTRAINT fk_match_history_user
        FOREIGN KEY (uid)
        REFERENCES "user"(uid),

    CONSTRAINT fk_match_history_table
        FOREIGN KEY (table_id)
        REFERENCES game_room(table_id)
);
