/** Studio 表 DDL（供 migrateStudioSchema 使用） */

export const STUDIO_PROJECTS_DDL = `
    CREATE TABLE studio_projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      search_profile_json JSON NOT NULL,
      default_template_id VARCHAR(64) NULL,
      kb_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_user_id (user_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

export const STUDIO_TEMPLATES_DDL = `
    CREATE TABLE studio_workflow_templates (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT NULL,
      plan_json JSON NOT NULL,
      default_search_profile_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

export const STUDIO_RUNS_DDL = `
    CREATE TABLE studio_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      user_id INT NOT NULL,
      user_query TEXT NOT NULL,
      plan_json JSON NULL,
      status ENUM('pending','running','completed','failed','aborted') NOT NULL DEFAULT 'pending',
      error_message TEXT NULL,
      started_at TIMESTAMP NULL,
      finished_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_project_id (project_id),
      KEY idx_user_id (user_id),
      FOREIGN KEY (project_id) REFERENCES studio_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

export const STUDIO_RUN_STEPS_DDL = `
    CREATE TABLE studio_run_steps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      run_id INT NOT NULL,
      step_id VARCHAR(64) NOT NULL,
      worker VARCHAR(32) NOT NULL,
      status ENUM('pending','running','completed','failed','skipped') NOT NULL DEFAULT 'pending',
      handoff_json JSON NULL,
      react_trace_json JSON NULL,
      step_summary TEXT NULL,
      duration_ms INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_run_step (run_id, step_id),
      FOREIGN KEY (run_id) REFERENCES studio_runs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

export const STUDIO_MATERIALS_DDL = `
    CREATE TABLE studio_materials (
      id CHAR(36) PRIMARY KEY,
      run_id INT NOT NULL,
      project_id INT NOT NULL,
      source_type ENUM('kb','web','url','upload') NOT NULL,
      title VARCHAR(512) NOT NULL,
      url VARCHAR(2048) NULL,
      snippet TEXT NULL,
      content MEDIUMTEXT NOT NULL,
      content_char_count INT NOT NULL DEFAULT 0,
      metadata_json JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_run_id (run_id),
      KEY idx_project_id (project_id),
      FOREIGN KEY (run_id) REFERENCES studio_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES studio_projects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

export const STUDIO_ARTIFACTS_DDL = `
    CREATE TABLE studio_artifacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      run_id INT NOT NULL,
      kind ENUM('summary','video_script','report','chat_transcript') NOT NULL,
      content_json JSON NOT NULL,
      markdown MEDIUMTEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_run_id (run_id),
      FOREIGN KEY (run_id) REFERENCES studio_runs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;
