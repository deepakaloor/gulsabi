// Gulsabi main.js — bootstraps page-level analytics.
// Runs page_view, game_card_view (via [data-game-card-id]), exit
// tracking, PWA install events and error reporting in one call.
import { setupPageTracking } from "./analytics.js";
setupPageTracking();
