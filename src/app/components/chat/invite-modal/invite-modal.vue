<script lang="ts">
import { Inject, mixins, Options, Prop } from 'vue-property-decorator';
import { fuzzysearch } from '../../../../utils/string';
import { BaseModal } from '../../../../_common/modal/base';
import AppScrollScroller from '../../../../_common/scroll/AppScrollScroller.vue';
import AppUserAvatarImg from '../../../../_common/user/user-avatar/img/img.vue';
import AppUserAvatarList from '../../../../_common/user/user-avatar/list/list.vue';
import { ChatStore, ChatStoreKey } from '../chat-store';
import { addGroupMembers, addGroupRoom } from '../client';
import { ChatRoom } from '../room';
import { ChatUser } from '../user';

@Options({
	components: {
		AppScrollScroller,
		AppUserAvatarImg,
		AppUserAvatarList,
	},
})
export default class AppChatInviteModal extends mixins(BaseModal) {
	@Prop({ type: Object, required: true }) room!: ChatRoom;
	@Prop({ type: Array, required: true }) friends!: ChatUser[];
	@Prop({ type: Object, default: null }) initialUser!: ChatUser | null;

	@Inject({ from: ChatStoreKey })
	chatStore!: ChatStore;

	filterQuery = '';
	selectedUsers: ChatUser[] = this.initialUser ? [this.initialUser] : [];

	get chat() {
		return this.chatStore.chat!;
	}

	get filteredUsers() {
		if (!this.filterQuery) {
			return this.friends;
		}

		const filter = this.filterQuery.toLowerCase();
		return this.friends.filter(
			i =>
				fuzzysearch(filter, i.display_name.toLowerCase()) ||
				fuzzysearch(filter, i.username.toLowerCase())
		);
	}

	invite() {
		const selectedUsers = this.selectedUsers.map(chatUser => chatUser.id);

		if (this.room.isPmRoom) {
			addGroupRoom(this.chat, selectedUsers);
		} else {
			addGroupMembers(this.chat, this.room.id, selectedUsers);
		}
		this.modal.dismiss();
	}

	toggle(user: ChatUser) {
		const index = this.selectedUsers.findIndex(chatUser => chatUser.id === user.id);
		if (index !== -1) {
			this.selectedUsers.splice(index, 1);
		} else {
			this.selectedUsers.push(user);
		}
	}

	selected(user: ChatUser) {
		return this.selectedUsers.some(chatUser => chatUser.id === user.id);
	}
}
</script>

<template>
	<AppModal>
		<template #default>
			<div class="modal-controls">
				<AppButton @click="modal.dismiss()">
					<AppTranslate>Close</AppTranslate>
				</AppButton>
			</div>

			<div class="modal-header">
				<h2 class="modal-title">
					<AppTranslate>Choose Friends</AppTranslate>
				</h2>
			</div>

			<div class="modal-body">
				<div class="friend-select-widget">
					<input
						v-model="filterQuery"
						class="-filter form-control"
						placeholder="Filter..."
					/>

					<AppScrollScroller>
						<div class="-user-list">
							<div
								v-for="user of filteredUsers"
								:key="user.id"
								class="-user-list-item"
								@click="toggle(user)"
							>
								<div class="-avatar">
									<AppUserAvatarImg :user="user" />
								</div>

								<div class="-label">
									<div class="-name">
										{{ user.display_name }}
									</div>
									<div class="-username">@{{ user.username }}</div>
								</div>
								<div class="-radio" :class="{ '-active': selected(user) }">
									<AppJolticon
										:icon="selected(user) ? 'checkbox' : 'box-empty'"
									/>
								</div>
							</div>
						</div>
					</AppScrollScroller>
				</div>
			</div>
		</template>

		<template #footer>
			<div class="-bottom">
				<AppUserAvatarList
					v-if="selectedUsers.length > 0"
					class="-selected-users"
					:users="selectedUsers"
					sm
				/>

				<AppButton primary block :disabled="selectedUsers.length < 1" @click="invite">
					<template v-if="room.isPmRoom">
						<AppTranslate>Create Group</AppTranslate>
					</template>
					<template v-else>
						<AppTranslate>Add To Group</AppTranslate>
					</template>
				</AppButton>
			</div>
		</template>
	</AppModal>
</template>

<style lang="stylus" scoped>
$-v-padding = 15px
$-h-padding = 20px
$-height = 40px

.-filter
	margin-bottom: 8px

.-user-list-item
	theme-prop('border-bottom-color', 'bg-subtle')
	display: flex
	align-items: center
	padding: $-v-padding 0
	height: $-height + $-v-padding * 2
	overflow: hidden
	border-bottom-width: $border-width-small
	border-bottom-style: solid
	cursor: pointer

	&:last-child
		border-bottom: 0

	&:hover
		.-radio
			color: var(--theme-link-hover)

.-radio
	color: var(--theme-bg-subtle)

	&.-active
		color: var(--theme-highlight)

.-avatar
	flex: none
	width: $-height
	margin-right: $-h-padding

.-label
	flex: auto
	overflow: hidden

.-name
.-username
	text-overflow()

.-name
	font-weight: bold

.-username
	theme-prop('color', 'fg-muted')
	font-size: $font-size-small

.-button
	flex: none
	margin-left: $-h-padding

.-selected-users
	display: flex
	justify-content: center
	margin-top: -10px
	margin-bottom: 4px

.-bottom
	padding-bottom: $line-height-computed
</style>
