export const PLATFORM_TABLE_DDL = [
    `CREATE TABLE IF NOT EXISTS platform_runs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      skill_id VARCHAR(64) NOT NULL,
      user_message TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'running',
      reply TEXT NULL,
      error_message TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      finished_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS platform_run_steps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      run_id INT NOT NULL,
      step_index INT NOT NULL,
      event_type VARCHAR(32) NOT NULL,
      payload_json JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES platform_runs(id) ON DELETE CASCADE,
      KEY idx_run_step (run_id, step_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS platform_materials (
      id INT AUTO_INCREMENT PRIMARY KEY,
      run_id INT NOT NULL,
      source_url VARCHAR(2048) NULL,
      title VARCHAR(512) NULL,
      content_text MEDIUMTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES platform_runs(id) ON DELETE CASCADE,
      KEY idx_run_material (run_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS platform_artifacts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      run_id INT NOT NULL,
      title VARCHAR(512) NOT NULL,
      content_markdown MEDIUMTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (run_id) REFERENCES platform_runs(id) ON DELETE CASCADE,
      KEY idx_run_artifact (run_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
] as const;
