CREATE TABLE
    user_activities (
        idd UUID PRIMARY KEY,
        user_id UUID REFERENCES users (id),
        activity_type TEXT NOT NULL,
        system_category_id UUID,
        details TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW ()
    );