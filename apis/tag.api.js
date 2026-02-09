import TagController from "../controllers/tag.controller.js";

export const load = (app) => {
  app.get("/api/v1/tags/suggest", TagController.suggest);
  app.get("/api/v1/tags/all", TagController.getAllTags);
  app.get(
    "/api/v1/tags/generate-shared-code",
    TagController.createOrRegenerateSharedCode,
  );
  app.get(
    "/api/v1/tags/deactivate-shared-code",
    TagController.deactivateSharedCode,
  );

  app.get(
    "/api/v1/tags/import-shared-code",
    TagController.importWordsBySharedCode,
  );
};
