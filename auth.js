import jwt from "jsonwebtoken";
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET missing");
}
const TOKEN_DAYS = 7;
export const cookieOptions = {
  // protect the sid from the frontend so the user cannot access it
  httpOnly: true,
  // it protect the website CSRF(cross-site request forgery) protect from the attacks
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: TOKEN_DAYS * 24 * 60 * 60 * 1000,
};
// making the token
export function setAuthCookie(res, userId) {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: `${TOKEN_DAYS}d`,
    algorithm: ["HS256"],
  });
  res.cookie("token", token, cookieOptions);
}
// used to verify the token
export function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Login required" });
  }
  try {
    // it is used to verify the token
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
