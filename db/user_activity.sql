CREATE TABLE
    user_activities (
        idd UUID PRIMARY KEY,
        user_id UUID REFERENCES users (id),
        activity_type TEXT NOT NULL,
        system_category_id UUID REFERENCES system_categories (id),
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW (),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW ()
    );