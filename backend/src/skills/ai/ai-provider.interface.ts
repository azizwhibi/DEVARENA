/**
 * Interface du fournisseur IA.
 * Une seule méthode : envoyer un prompt et obtenir du JSON valide.
 * La clé API ne doit jamais quitter le serveur.
 */
export interface AiProvider {
  /**
   * Génère une réponse JSON structurée.
   * @param systemPrompt  Instructions système (ne doit pas inclure de données user brutes).
   * @param userBlock     Données utilisateur anonymisées, déjà échappées dans des blocs délimités.
   * @param timeoutMs     Délai max avant rejet (default 8000 ms côté appelant).
   * @returns             Objet JSON parsé ou null si timeout/erreur réseau/JSON invalide.
   */
  generateJson(
    systemPrompt: string,
    userBlock: string,
    timeoutMs: number,
  ): Promise<unknown | null>;
}

export const AI_PROVIDER_TOKEN = Symbol('AiProvider');
