\# API Contract



Base URL (production): https://paypal-hub-backend.onrender.com

Base URL (local): http://localhost:4000



All request and response bodies are JSON. Send `Content-Type: application/json` on POST requests.



\## Error format



Every error uses this shape:



&#x20;   { "error": { "code": "CODE", "message": "Human-readable message." } }



| Status | Code | Meaning |

|---|---|---|

| 400 | VALIDATION\_ERROR | Missing or malformed field, or body is not valid JSON |

| 401 | UNAUTHORIZED | Missing, invalid, or expired token |

| 401 | INVALID\_CREDENTIALS | Wrong email or password |

| 401 | INVALID\_GOOGLE\_TOKEN | Firebase ID token could not be verified |

| 401 | UNVERIFIED\_EMAIL | Google account email is not verified |

| 409 | EMAIL\_TAKEN | An account with this email already exists |

| 500 | INTERNAL\_ERROR | Unexpected server error |



\## Tokens



Signup, login, and Google sign-in return a token that expires after 24 hours. Send it on protected routes as:



&#x20;   Authorization: Bearer <token>



When a protected route returns 401, clear the stored token and send the user to login. Logout does not invalidate the token on the server. The frontend must delete its stored copy.



\## GET /health



No auth. Response 200:



&#x20;   { "status": "ok" }



\## POST /auth/signup



Request:



&#x20;   { "email": "ada@example.com", "password": "at-least-8-chars" }



Response 201:



&#x20;   {

&#x20;     "user": { "id": "usr\_1a2b3c4d", "email": "ada@example.com" },

&#x20;     "token": "eyJ..."

&#x20;   }



Errors: 400 VALIDATION\_ERROR, 409 EMAIL\_TAKEN



Rules: email must look like an address. Password must be at least 8 characters.



\## POST /auth/login



Request:



&#x20;   { "email": "ada@example.com", "password": "at-least-8-chars" }



Response 200:



&#x20;   {

&#x20;     "user": { "id": "usr\_1a2b3c4d", "email": "ada@example.com" },

&#x20;     "token": "eyJ..."

&#x20;   }



Errors: 400 VALIDATION\_ERROR, 401 INVALID\_CREDENTIALS



Accounts created with Google have no password, so they cannot log in here.



\## POST /auth/google



Firebase sign-in. The frontend signs the user in with Firebase, then sends the ID token here.



Request:



&#x20;   { "idToken": "firebase-id-token" }



Response 200:



&#x20;   {

&#x20;     "user": { "id": "usr\_1a2b3c4d", "email": "ada@example.com" },

&#x20;     "token": "eyJ..."

&#x20;   }



If no account exists for that email, one is created. If one exists, it is returned.



Errors: 400 VALIDATION\_ERROR, 401 INVALID\_GOOGLE\_TOKEN, 401 UNVERIFIED\_EMAIL



\## GET /auth/me



Header: `Authorization: Bearer <token>`



Response 200:



&#x20;   { "user": { "id": "usr\_1a2b3c4d", "email": "ada@example.com" } }



Errors: 401 UNAUTHORIZED



\## POST /auth/logout



Header: `Authorization: Bearer <token>`



Response 204, no body.



Errors: 401 UNAUTHORIZED

