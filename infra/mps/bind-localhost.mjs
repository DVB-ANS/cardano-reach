// Préchargé dans MPS (`NODE_OPTIONS=--import=<ce fichier>`) : MPS passe `listen: PORT` à express-zod-api, sans hôte,
// donc Node écoute sur toutes les interfaces. MPS-SETUP.md exige 127.0.0.1 uniquement : on ajoute l'hôte au seul
// listen du port de MPS, les autres serveurs du processus ne changent pas.
import net from "node:net";

const port = Number(process.env.PORT);
const listen = net.Server.prototype.listen;

net.Server.prototype.listen = function (...args) {
  const [first] = args;
  if ((typeof first === "number" || typeof first === "string") && Number(first) === port && typeof args[1] !== "string") {
    args.splice(1, 0, "127.0.0.1");
  } else if (typeof first === "object" && first !== null && Number(first.port) === port && first.host === undefined) {
    args[0] = { ...first, host: "127.0.0.1" };
  }
  return listen.apply(this, args);
};
