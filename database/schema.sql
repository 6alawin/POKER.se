
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

CREATE TABLE "user" (
    uid VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255),
    username VARCHAR(30),
    current_card_skin VARCHAR(255),
    current_table_skin VARCHAR(255)
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
