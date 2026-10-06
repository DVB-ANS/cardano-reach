// Richard n'utilise pas de sandbox (outils dans le runtime de l'app) : just-bash, sans conteneur ni VM,
// évite que `eve build` cherche Docker ou microsandbox sur la machine de build.
import { defineSandbox } from "eve/sandbox";
import { JustBashSandbox } from "eve/sandbox/just-bash";

export const environment = JustBashSandbox.environment();
export default defineSandbox(() => environment.open());
