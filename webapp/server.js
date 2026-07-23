const fs = require("fs");
const path = require("path");
const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const port = Number(process.env.PORT || 3000);

const adminUsername = process.env.ADMIN_USERNAME || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "2400710@sit.singaporetech.edu.sg";

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD || "apppassword",
  database: process.env.DB_NAME || "practical_db",
  waitForConnections: true,
  connectionLimit: 10
};

const passwordFile = process.env.PASSWORD_FILE ||
  path.join(__dirname, "data", "100k-most-used-passwords-NCSC.txt");

const pool = mysql.createPool(dbConfig);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function isPrintableAscii(password) {
  return [...password].every((char) => {
    const code = char.charCodeAt(0);
    return code >= 32 && code <= 126;
  });
}

function validatePasswordBasic(password) {
  if (!password || password.length < 10) {
    return { ok: false, message: "Password must be at least 10 characters." };
  }
  if (!isPrintableAscii(password)) {
    return { ok: false, message: "Password must use printable ASCII characters." };
  }
  return { ok: true, message: "Basic password checks passed." };
}

async function isCommonPassword(password) {
  const [rows] = await pool.execute(
    "SELECT password FROM common_passwords WHERE password = ? LIMIT 1",
    [password.toLowerCase()]
  );
  return rows.length > 0;
}

async function validatePasswordBackend(password) {
  const basic = validatePasswordBasic(password);
  if (!basic.ok) {
    return basic;
  }
  if (await isCommonPassword(password)) {
    return { ok: false, message: "Password is in the common password blocklist." };
  }
  return { ok: true, message: "Password accepted." };
}

function layout(title, body) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <script>
    async function validatePasswordFrontend(password) {
      if (!password || password.length < 10) {
        return { ok: false, message: "Password must be at least 10 characters." };
      }
      for (const char of password) {
        const code = char.charCodeAt(0);
        if (code < 32 || code > 126) {
          return { ok: false, message: "Password must use printable ASCII characters." };
        }
      }
      const response = await fetch("/api/check-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      return response.json();
    }

    window.addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("form[data-secure-password]").forEach((form) => {
        form.addEventListener("submit", async (event) => {
          const passwordInput = form.querySelector("input[name='password']");
          const result = await validatePasswordFrontend(passwordInput.value);
          if (!result.ok) {
            event.preventDefault();
            document.getElementById("message").textContent = result.message;
          }
        });
      });
    });
  </script>
</head>
<body>
${body}
</body>
</html>`;
}

function homePage(message = "") {
  return layout("Login Page", `
  <h1>Login Page</h1>
  <p id="message">${message}</p>
  <form method="POST" action="/login" data-secure-password>
    <label>Username:</label>
    <input type="text" name="username" required>
    <label>Password:</label>
    <input type="password" name="password" required>
    <button type="submit">Login</button>
  </form>
  <p><a href="/create-account">Create account</a></p>
  `);
}

function createAccountPage(message = "") {
  return layout("Create Account", `
  <h1>Create Account</h1>
  <p id="message">${message}</p>
  <form method="POST" action="/create-account" data-secure-password>
    <label>Username:</label>
    <input type="text" name="username" required>
    <label>Password:</label>
    <input type="password" name="password" required>
    <button type="submit">Create Account</button>
  </form>
  <p><a href="/">Back to login</a></p>
  `);
}

function welcomePage(password) {
  return layout("Welcome", `
  <h1>Welcome</h1>
  <p>Password entered: ${password}</p>
  <form method="GET" action="/logout">
    <button type="submit">Logout</button>
  </form>
  `);
}

async function seedCommonPasswords() {
  if (!fs.existsSync(passwordFile)) {
    console.log("Password list not found. Skipping seed.");
    return;
  }

  const content = fs.readFileSync(passwordFile, "utf8");
  const passwords = [...new Set(
    content
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean)
  )];

  const chunkSize = 1000;
  for (let i = 0; i < passwords.length; i += chunkSize) {
    const chunk = passwords.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => "(?)").join(",");
    await pool.execute(
      `INSERT IGNORE INTO common_passwords (password) VALUES ${placeholders}`,
      chunk
    );
  }
  console.log(`Seeded ${passwords.length} common passwords.`);
}

app.get("/", (req, res) => {
  res.send(homePage());
});

app.post("/api/check-password", async (req, res) => {
  const result = await validatePasswordBackend(req.body.password || "");
  res.json(result);
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const result = await validatePasswordBackend(password || "");

  if (!result.ok || username !== adminUsername || password !== adminPassword) {
    res.status(200).send(homePage(result.ok ? "Invalid username or password." : result.message));
    return;
  }

  res.send(welcomePage(password));
});

app.get("/create-account", (req, res) => {
  res.send(createAccountPage());
});

app.post("/create-account", async (req, res) => {
  const { username, password } = req.body;
  const result = await validatePasswordBackend(password || "");

  if (!result.ok) {
    res.status(200).send(createAccountPage(result.message));
    return;
  }

  await pool.execute(
    "INSERT INTO `2400710` (username, created_at) VALUES (?, NOW())",
    [username]
  );
  res.send(welcomePage(password));
});

app.get("/logout", (req, res) => {
  res.redirect("/");
});

async function start() {
  await seedCommonPasswords();
  app.listen(port, "0.0.0.0", () => {
    console.log(`Web app listening on port ${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});