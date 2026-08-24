import pool from '../db';

const profilePictures = [
    { id: 'cowboy', name: 'Cowboy', assetUrl: '/src/assets/picture_profile/cowboy.png' },
    { id: 'pine-tree', name: 'Pine Tree', assetUrl: '/src/assets/picture_profile/pine-tree.webp' },
    { id: 'cherry-tree', name: 'Cherry Tree', assetUrl: '/src/assets/picture_profile/cherry-tree.webp' },
    { id: 'ice-fishing', name: 'Ice Fishing', assetUrl: '/src/assets/picture_profile/ice-fishing.png' },
    { id: 'wizard', name: 'Wizard', assetUrl: '/src/assets/picture_profile/wizard.png' },
    { id: 'undertaker', name: 'Undertaker', assetUrl: '/src/assets/picture_profile/undertaker.png' },
    { id: 'plague-doctor', name: 'Plague Doctor', assetUrl: '/src/assets/picture_profile/plague-doctor.png' },
] as const;

/** Creates the application schema if it has not been created yet. */
export async function InitDB(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(`
        CREATE TABLE IF NOT EXISTS card_skin (
            skin_id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255),
            asset_url VARCHAR(255)
        )
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS table_skin (
            skin_id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255),
            asset_url VARCHAR(500)
        )
    `);

    await client.query(`
        INSERT INTO card_skin (skin_id, name, asset_url)
        VALUES ('default_card', 'Default Card', '')
        ON CONFLICT (skin_id) DO NOTHING
    `);

    await client.query(`
        INSERT INTO table_skin (skin_id, name, asset_url)
        VALUES ('default_table', 'Default Table', '')
        ON CONFLICT (skin_id) DO NOTHING
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS picture_profile (
            picture_id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255),
            asset_url VARCHAR(500)
        )
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS "user" (
            uid VARCHAR(50) PRIMARY KEY,
            email VARCHAR(255),
            username VARCHAR(30),
            current_card_skin VARCHAR(255),
            current_table_skin VARCHAR(255),
            picture_id VARCHAR(255),
            CONSTRAINT fk_user_card_skin
                FOREIGN KEY (current_card_skin) REFERENCES card_skin(skin_id),
            CONSTRAINT fk_user_table_skin
                FOREIGN KEY (current_table_skin) REFERENCES table_skin(skin_id),
            CONSTRAINT fk_user_picture
                FOREIGN KEY (picture_id) REFERENCES picture_profile(picture_id)
        )
    `);

    // Keep databases created before profile pictures compatible with this schema.
    await client.query(`
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS picture_id VARCHAR(255)
    `);

    // Migrate the earlier column names used by the first profile schema.
    await client.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user' AND column_name = 'skin_id'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user' AND column_name = 'current_card_skin'
            ) THEN
                ALTER TABLE "user" RENAME COLUMN skin_id TO current_card_skin;
            END IF;

            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user' AND column_name = 'table_skin_id'
            ) AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user' AND column_name = 'current_table_skin'
            ) THEN
                ALTER TABLE "user" RENAME COLUMN table_skin_id TO current_table_skin;
            END IF;
        END $$;
    `);

    for (const picture of profilePictures) {
        await client.query(
            `INSERT INTO picture_profile (picture_id, name, asset_url)
             VALUES ($1, $2, $3)
             ON CONFLICT (picture_id) DO UPDATE
             SET name = EXCLUDED.name, asset_url = EXCLUDED.asset_url`,
            [picture.id, picture.name, picture.assetUrl],
        );
    }

    await client.query(`
        UPDATE "user"
        SET current_card_skin = COALESCE(current_card_skin, 'default_card'),
            current_table_skin = COALESCE(current_table_skin, 'default_table'),
            picture_id = COALESCE(picture_id, 'cowboy')
    `);

    await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_card_skin'
            ) THEN
                ALTER TABLE "user"
                ADD CONSTRAINT fk_user_card_skin
                FOREIGN KEY (current_card_skin) REFERENCES card_skin(skin_id);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_table_skin'
            ) THEN
                ALTER TABLE "user"
                ADD CONSTRAINT fk_user_table_skin
                FOREIGN KEY (current_table_skin) REFERENCES table_skin(skin_id);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_picture'
            ) THEN
                ALTER TABLE "user"
                ADD CONSTRAINT fk_user_picture
                FOREIGN KEY (picture_id) REFERENCES picture_profile(picture_id);
            END IF;
        END $$;
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS game_room (
            table_id VARCHAR(255) PRIMARY KEY,
            host_id VARCHAR(255),
            status VARCHAR(20),
            max_player INTEGER,
            current_player INTEGER,
            created_at TIMESTAMP,
            CONSTRAINT fk_game_room_host
            FOREIGN KEY (host_id) REFERENCES "user"(uid)
        )
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS roomplayer (
            table_id VARCHAR(255),
            pk_fk VARCHAR(255),
            uid VARCHAR(50),
            seat_number INTEGER,
            is_bot BOOLEAN,
            chip_stack INTEGER,
            joined_at TIMESTAMP,
            CONSTRAINT fk_roomplayer_table
            FOREIGN KEY (table_id) REFERENCES game_room(table_id),
            CONSTRAINT fk_roomplayer_user
            FOREIGN KEY (uid) REFERENCES "user"(uid)
        )
    `);

    await client.query(`
        CREATE TABLE IF NOT EXISTS match_history (
            history_id VARCHAR(255) PRIMARY KEY,
            uid VARCHAR(50),
            table_id VARCHAR(255),
            result VARCHAR(255),
            pot_amount INTEGER,
            chip_change INTEGER,
            played_at TIMESTAMP,
            CONSTRAINT fk_match_history_user
            FOREIGN KEY (uid) REFERENCES "user"(uid),
            CONSTRAINT fk_match_history_table
            FOREIGN KEY (table_id) REFERENCES game_room(table_id)
        )
    `);


    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export default InitDB;
