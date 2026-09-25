const isMobile = () =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export function signInWithGoogle() {
  console.warn(
    '[google-auth] Google login is not configured in the EventFlow backend yet.'
  );
}

export async function handleGoogleRedirect() {
  // Reserved for future Google OAuth integration.
}