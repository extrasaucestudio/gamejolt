import { ActivityFeedInput } from './item-service';
import { ActivityFeedContainer, ActivityFeedContainerOptions } from './feed-container-service';
import { History } from '../../../../lib/gj-lib-client/components/history/history.service';
import { router } from '../../../views/index';

/**
 * Number of states we will keep cached.
 * We will purge others out of the cache.
 */
const MAX_CACHED_COUNT = 3;

interface ActivityFeedState {
	url: string;
	container: ActivityFeedContainer;
}

export class ActivityFeedService {
	private static _states: ActivityFeedState[] = [];

	static bootstrap(items?: ActivityFeedInput[], options?: ActivityFeedContainerOptions) {
		const url = router.currentRoute.fullPath;

		// If we're bootstrapping in historical, just return what we had.
		// We only do this if we are going back to the latest state that we have
		// stored items for.
		if (History.inHistorical) {
			console.log('in historical state!', url);
			const state = this._states.find(item => item.url === url);
			if (state) {
				console.log('got state container!', state);
				return state.container;
			}
		}

		// If items passed in were null then they were trying to pull from
		// cache. Since we got here we don't have any cached state, so return
		// null.
		if (!items || !options) {
			console.log(`couldn't bootstrap feed`);
			return null;
		}

		// If we're not going back/forward in history, but rather a new page
		// then always bootstrap a new state container. This will clear out any
		// historical ones for this URL.
		const index = this._states.findIndex(item => item.url === url);
		if (index !== -1) {
			this._states.splice(0, index);
		}

		const newState = {
			url,
			container: new ActivityFeedContainer(items, options),
		};

		// Keep it trimmed.
		this._states.unshift(newState);
		this._states = this._states.slice(0, MAX_CACHED_COUNT);

		console.log('add new state container', newState);
		return newState.container;
	}
}
