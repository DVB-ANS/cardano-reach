// Sans ce fichier, `eve start` rejette tout le trafic. Le worker s'authentifie en Basic ; `localDev()` ne vaut que sous `eve dev`.
// Les identifiants sont lus à chaque requête : `eve build` évalue ce module sans les secrets du serveur.
// Leur présence au démarrage est vérifiée par `scripts/launch.ts start`.
import { localDev, verifyHttpBasic, type AuthFn } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

function basicFromEnv(): AuthFn<Request> {
  return (request) => {
    const username = process.env.ROUTE_AUTH_BASIC_USER;
    const password = process.env.ROUTE_AUTH_BASIC_PASSWORD;
    if (!username || !password) return null;
    const result = verifyHttpBasic(request.headers.get("authorization"), { username, password });
    return result.ok ? result.sessionAuth : null;
  };
}

export default eveChannel({ auth: [basicFromEnv(), localDev()] });
