import { RouteLocationNormalized, RouteLocationNormalizedLoaded, Router } from 'vue-router';
import { arrayRemove } from '../../../../utils/array';
import { RouteLocationDefinition } from '../../../../utils/router';
import { EventItem } from '../../../../_common/event-item/event-item.model';
import { FiresidePostGotoGrowl } from '../../../../_common/fireside/post/goto-growl/goto-growl.service';
import { FiresidePost } from '../../../../_common/fireside/post/post-model';
import { Game } from '../../../../_common/game/game.model';
import { HistoryCache } from '../../../../_common/history/cache/cache.service';
import { Notification } from '../../../../_common/notification/notification-model';
import { AppRoute } from '../../../../_common/route/route-component';
import { User } from '../../../../_common/user/user.model';
import { ActivityFeedInput } from './item-service';
import { ActivityFeedState, ActivityFeedStateOptions } from './state';
import { ActivityFeedView, ActivityFeedViewOptions } from './view';

/**
 * Number of states we will keep cached. We will purge others out of the cache.
 */
const MaxCachedCount = 3;

interface ActivityFeedCachedState {
	href?: string;
	view: ActivityFeedView;
}

function getTabForPost(post: FiresidePost) {
	if (post.isScheduled) {
		return 'scheduled';
	} else if (post.isDraft) {
		return 'draft';
	}

	return 'active';
}

function postFromEventItem(eventItem: EventItem) {
	return eventItem.action as FiresidePost;
}

type BootstrapOptions = ActivityFeedViewOptions & ActivityFeedStateOptions;

export class ActivityFeedService {
	private static cache: ActivityFeedCachedState[] = [];

	static makeFeedUrl(route: RouteLocationNormalized, url: string) {
		if (url.indexOf('?') === -1) {
			url += '?ignore';
		}

		// Attach the scroll ID if it exists in the URL. This is for SSR
		// pagination.
		if (route.query.feed_last_id) {
			url += '&scrollId=' + route.query.feed_last_id;
		}

		return url;
	}

	static routeInit(isRouteBootstrapped: boolean) {
		// Try to pull the feed from cache if they are going back to this route.
		// We don't want to pull from cache if they go back and forth between
		// feed tabs, though.
		if (!isRouteBootstrapped) {
			return this.bootstrapFeedFromCache();
		}
		return null;
	}

	static routed(
		feed: ActivityFeedView | null,
		options: BootstrapOptions,
		items: any[],
		fromPayloadCache: boolean
	) {
		// If there is a feed pulled from cache in routeInit, we just use that.
		if (feed) {
			return feed;
		}

		// Never pull from cache.
		if (fromPayloadCache) {
			return null;
		}

		// If we couldn't fetch a cached feed when routeInit was called, we
		// should start fresh.
		return ActivityFeedService.bootstrapFeed(items, options);
	}

	/**
	 * Determines if we are in the correct managing route for the post.
	 * Does NOT check if we are in the correct feed on that route.
	 *
	 * Note: game posts may now be managed through the author's user profile
	 * as well as the game's dashboard.
	 */
	private static isInCorrectManageRoute(post: FiresidePost, route: RouteLocationNormalized) {
		if (post.post_to_user_profile && this.isInCorrectUserManageRoute(post.user, route)) {
			return true;
		}

		if (post.game instanceof Game) {
			return this.isInCorrectGameManageRoute(post.game, route);
		}

		return this.isInCorrectUserManageRoute(post.user, route);
	}

	private static isInCorrectGameManageRoute(game: Game, route: RouteLocationNormalized) {
		return (
			route.name === 'dash.games.manage.devlog' &&
			route.params.id.toString() === game.id.toString()
		);
	}

	private static isInCorrectUserManageRoute(user: User, route: RouteLocationNormalized) {
		return route.name === 'profile.overview' && route.params.username === user.username;
	}

	/**
	 * Checks if the feed is correct for the post on the current route.
	 */
	private static isInCorrectManageFeed(post: FiresidePost, route: RouteLocationNormalized) {
		if (post.status === FiresidePost.STATUS_ACTIVE) {
			return !route.query['tab'];
		} else if (post.status === FiresidePost.STATUS_DRAFT) {
			if (post.isScheduled) {
				return route.query['tab'] === 'scheduled';
			}

			return route.query['tab'] === 'draft';
		}
		return false;
	}

	/**
	 * Checks if the currently active feed is a scheduled feed.
	 */
	private static isScheduledFeed(route: RouteLocationNormalized) {
		return route.query['tab'] === 'scheduled';
	}

	/**
	 * Checks if we are in the correct game overview route for a post.
	 */
	private static isInCorrectGameOverview(post: FiresidePost, route: RouteLocationNormalized) {
		return (
			post.game instanceof Game &&
			route.name === 'discover.games.view.overview' &&
			route.params.id.toString() === post.game.id.toString() &&
			post.status === FiresidePost.STATUS_ACTIVE
		);
	}

	/**
	 * Returns the correct location for a post's manage feed.
	 * Assumes the route name/params are already correct.
	 */
	private static getCorrectManageFeedLocation(
		post: FiresidePost,
		route: RouteLocationNormalized
	): RouteLocationDefinition {
		const location: RouteLocationDefinition = {
			name: route.name ?? undefined,
			params: route.params,
		};

		this.applyCorrectManageFeedLocation(post, location);

		return location;
	}

	private static applyCorrectManageFeedLocation(
		post: FiresidePost,
		location: RouteLocationDefinition
	) {
		const tab = getTabForPost(post);
		if (tab !== 'active') {
			location.query = { tab };
		}
	}

	static onPostAdded(options: {
		feed: ActivityFeedView;
		post: FiresidePost;
		route: RouteLocationNormalizedLoaded;
		router: Router;
		appRoute: AppRoute;
	}) {
		const { post, feed, route, router, appRoute } = options;

		if (!post.event_item) {
			throw new Error('Post was expected to have an event_item field after being added');
		}

		if (this.isInCorrectManageRoute(post, route)) {
			if (this.isInCorrectManageFeed(post, route)) {
				// We are in the correct route and feed.
				if (this.isScheduledFeed(route)) {
					// Reload the route because scheduled feeds aren't ordered by added on, so we can't prepend.
					appRoute.reload();
				} else {
					// We are go to prepend.
					feed.prepend([post.event_item]);
				}
			} else {
				// Redirect to the correct feed.
				const location = this.getCorrectManageFeedLocation(post, route);
				router.push(location);
			}
		} else if (this.isInCorrectGameOverview(post, route)) {
			// When an active post got created in the correct game overview, we can prepend.
			feed.prepend([post.event_item]);
		} else {
			// Otherwise show a growl with links to the post.
			FiresidePostGotoGrowl.show(post, 'add');
		}
	}

	static onPostEdited(options: {
		eventItem: EventItem;
		route: RouteLocationNormalizedLoaded;
		router: Router;
		appRoute: AppRoute;
	}) {
		const { eventItem, route, router, appRoute } = options;

		const post = postFromEventItem(eventItem);

		// The post gets its changes applied when edited through a non-manage feed.
		// That also means that it's always a published post.

		// If we are in a manage feed though, check if we are NOT in the correct feed anymore.
		if (this.isInCorrectManageRoute(post, route)) {
			if (!this.isInCorrectManageFeed(post, route)) {
				// Redirect to the correct feed.
				const location = this.getCorrectManageFeedLocation(post, route);
				router.push(location);
			} else if (this.isScheduledFeed(route)) {
				// If we still are in the correct feed, but it's a scheduled feed:
				// Means we had a scheduled post that remained a scheduled post and it got changed in another way.
				// Since we cannot make sure its position within the feed is still valid, we reload.
				appRoute.reload();
			}
		} else {
			// If we just toggled off post_to_user_profile on a game post while
			// viewing it in the user's feed, we should redirect to the game's feed.
			if (
				!post.post_to_user_profile &&
				this.isInCorrectUserManageRoute(post.user, route) &&
				post.game
			) {
				const location: RouteLocationDefinition = {
					name: 'dash.games.manage.devlog',
					params: {
						id: post.game.id.toString(),
					},
				};
				this.applyCorrectManageFeedLocation(post, location);
				router.push(location);
			}
		}
	}

	static onPostPublished(options: {
		eventItem: EventItem;
		route: RouteLocationNormalizedLoaded;
		router: Router;
		appRoute: AppRoute;
	}) {
		const { eventItem, route, router } = options;

		const post = postFromEventItem(eventItem);

		// Redirect to the active posts feed.
		// A post can only be published from the draft/scheduled feed of the correct route, no need to redirect.
		const location = this.getCorrectManageFeedLocation(post, route);
		router.push(location);

		// Show the publish growl to give them an option to go to the community.
		if (post.communities.length > 0) {
			FiresidePostGotoGrowl.show(post, 'publish');
		}
	}

	private static makeCachedState(items: ActivityFeedInput[], options: BootstrapOptions) {
		const href = typeof window !== 'undefined' ? window.location.href : undefined;

		const state = new ActivityFeedState(options);
		const view = new ActivityFeedView(state, options);
		view.append(items);

		const cachedState: ActivityFeedCachedState = {
			href,
			view,
		};

		// Keep it trimmed.
		this.cache.unshift(cachedState);
		this.cache = this.cache.slice(0, MaxCachedCount);

		return cachedState;
	}

	private static findCachedState() {
		const historyState = HistoryCache.getHistoryState();
		if (!historyState) {
			return undefined;
		}

		const href = typeof window !== 'undefined' ? window.location.href : undefined;

		// Note that we have to check the history state key AND the actual URL.
		// If you replace a route with vue, the history state key stays the
		// same, even though the route changes.
		return this.cache.find(i => i.href === href);
	}

	static bootstrapFeedFromCache() {
		const state = this.findCachedState();
		if (state) {
			// Reset bootstrapped items so that we can go "back" to this feed
			// really fast.
			state.view.resetBootstrapped();

			// We have to put the state back on top so that it was just
			// accessed. We don't want it being cleaned up.
			arrayRemove(this.cache, i => i === state);
			this.cache.unshift(state);

			return state.view;
		}

		return null;
	}

	private static bootstrapFeed(items: any[], options: BootstrapOptions) {
		const populatedItems =
			options.type === 'EventItem' ? EventItem.populate(items) : Notification.populate(items);

		const state = this.makeCachedState(populatedItems, options);
		return state.view;
	}
}

export function feedShouldBlockPost(post: FiresidePost, route: RouteLocationNormalized) {
	if (post.game === null && post.user.is_blocked) {
		// We need to show if they force viewed the profile.
		if (route.name !== 'profile.overview' || route.params.username !== post.user.username) {
			return true;
		}
	}
	return false;
}
