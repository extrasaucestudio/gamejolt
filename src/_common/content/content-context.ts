import { arrayRemove } from '../../utils/array';
import { assertNever } from '../../utils/utils';
import { MediaItem } from '../media-item/media-item-model';

export type ContentContext =
	| 'fireside-post-lead'
	| 'fireside-post-article'
	| 'fireside-post-comment'
	| 'game-description'
	| 'game-comment'
	| 'user-comment'
	| 'user-bio'
	| 'forum-post'
	| 'community-description'
	| 'chat-message'
	| 'community-channel-description'
	| 'fireside-chat-message'
	| 'quest-stage-description';

export enum ContextCapabilityType {
	TextBold,
	TextItalic,
	TextLink,
	TextCode,
	TextStrike,

	CustomLink,
	Emoji,
	Tag,
	Mention,

	Media,
	Gif,

	EmbedVideo,
	EmbedMusic,
	EmbedModel,

	CodeBlock,
	Blockquote,
	List,
	HorizontalRule,
	Spoiler,
	Heading,
	Sticker,
}

export class ContextCapabilities {
	public capabilities: ContextCapabilityType[];

	get hasAnyBlock() {
		return (
			this.hasAnyEmbed ||
			this.media ||
			this.codeBlock ||
			this.blockquote ||
			this.list ||
			this.hr ||
			this.spoiler ||
			this.sticker
		);
	}
	get hasAnyText() {
		return (
			this.textBold ||
			this.textItalic ||
			(this.textLink && this.customLink) ||
			this.textCode ||
			this.textStrike
		);
	}
	get hasAnyEmbed() {
		return this.embedMusic || this.embedVideo || this.embedModel;
	}
	get textBold() {
		return this._hasCapability(ContextCapabilityType.TextBold);
	}
	get textItalic() {
		return this._hasCapability(ContextCapabilityType.TextItalic);
	}
	get textLink() {
		return this._hasCapability(ContextCapabilityType.TextLink);
	}
	get textCode() {
		return this._hasCapability(ContextCapabilityType.TextCode);
	}
	get textStrike() {
		return this._hasCapability(ContextCapabilityType.TextStrike);
	}
	get customLink() {
		return this._hasCapability(ContextCapabilityType.CustomLink);
	}
	get media() {
		// for media items, also allows uploading through the media upload component
		return this._hasCapability(ContextCapabilityType.Media);
	}
	get embedVideo() {
		return this._hasCapability(ContextCapabilityType.EmbedVideo);
	}
	get embedMusic() {
		return this._hasCapability(ContextCapabilityType.EmbedMusic);
	}
	get embedModel() {
		return this._hasCapability(ContextCapabilityType.EmbedModel);
	}
	get codeBlock() {
		return this._hasCapability(ContextCapabilityType.CodeBlock);
	}
	get blockquote() {
		return this._hasCapability(ContextCapabilityType.Blockquote);
	}
	get emoji() {
		return this._hasCapability(ContextCapabilityType.Emoji);
	}
	get list() {
		return this._hasCapability(ContextCapabilityType.List);
	}
	get hr() {
		return this._hasCapability(ContextCapabilityType.HorizontalRule);
	}
	get spoiler() {
		return this._hasCapability(ContextCapabilityType.Spoiler);
	}
	get tag() {
		return this._hasCapability(ContextCapabilityType.Tag);
	}
	get heading() {
		return this._hasCapability(ContextCapabilityType.Heading);
	}
	get mention() {
		return this._hasCapability(ContextCapabilityType.Mention);
	}
	get gif() {
		return this._hasCapability(ContextCapabilityType.Gif);
	}
	get sticker() {
		return this._hasCapability(ContextCapabilityType.Sticker);
	}

	private constructor(capabilities: ContextCapabilityType[]) {
		this.capabilities = capabilities;
	}

	_hasCapability(capability: ContextCapabilityType) {
		return this.capabilities.includes(capability);
	}

	removeCapability(capability: ContextCapabilityType) {
		arrayRemove(this.capabilities, i => i === capability);
	}

	public static getEmpty() {
		return new ContextCapabilities([]);
	}

	public static fromStringList(items: string[]) {
		const data = new Set<ContextCapabilityType>();

		for (const item of items) {
			const value: any = ContextCapabilityType[item as any];
			if (value !== undefined) {
				data.add(value);
			}
		}

		return new ContextCapabilities(Array.from(data));
	}

	public static getForContext(context: ContentContext) {
		switch (context) {
			case 'fireside-post-lead':
				return new ContextCapabilities([
					ContextCapabilityType.TextLink,
					ContextCapabilityType.Tag,
					ContextCapabilityType.Mention,
				]);
			case 'fireside-post-article':
			case 'forum-post':
				return new ContextCapabilities([
					ContextCapabilityType.TextBold,
					ContextCapabilityType.TextItalic,
					ContextCapabilityType.TextLink,
					ContextCapabilityType.TextCode,
					ContextCapabilityType.TextStrike,
					ContextCapabilityType.CustomLink,
					ContextCapabilityType.Media,
					ContextCapabilityType.EmbedVideo,
					ContextCapabilityType.EmbedMusic,
					ContextCapabilityType.EmbedModel,
					ContextCapabilityType.CodeBlock,
					ContextCapabilityType.Blockquote,
					ContextCapabilityType.Emoji,
					ContextCapabilityType.List,
					ContextCapabilityType.HorizontalRule,
					ContextCapabilityType.Spoiler,
					ContextCapabilityType.Tag,
					ContextCapabilityType.Heading,
					ContextCapabilityType.Mention,
					ContextCapabilityType.Gif,
				]);
			case 'game-description':
			case 'community-description':
			case 'community-channel-description':
				return new ContextCapabilities([
					ContextCapabilityType.TextBold,
					ContextCapabilityType.TextItalic,
					ContextCapabilityType.TextLink,
					ContextCapabilityType.TextCode,
					ContextCapabilityType.TextStrike,
					ContextCapabilityType.CustomLink,
					ContextCapabilityType.Media,
					ContextCapabilityType.CodeBlock,
					ContextCapabilityType.Blockquote,
					ContextCapabilityType.Emoji,
					ContextCapabilityType.List,
					ContextCapabilityType.HorizontalRule,
					ContextCapabilityType.Spoiler,
					ContextCapabilityType.Tag,
					ContextCapabilityType.Heading,
					ContextCapabilityType.Mention,
				]);
			case 'game-comment':
			case 'user-comment':
			case 'fireside-post-comment':
				return new ContextCapabilities([
					ContextCapabilityType.TextBold,
					ContextCapabilityType.TextItalic,
					ContextCapabilityType.TextLink,

					ContextCapabilityType.TextCode,
					ContextCapabilityType.TextStrike,
					ContextCapabilityType.CustomLink,
					ContextCapabilityType.Media,
					ContextCapabilityType.CodeBlock,
					ContextCapabilityType.Blockquote,
					ContextCapabilityType.Emoji,
					ContextCapabilityType.List,
					ContextCapabilityType.HorizontalRule,
					ContextCapabilityType.Spoiler,
					ContextCapabilityType.Tag,
					ContextCapabilityType.Mention,
					ContextCapabilityType.Gif,
				]);
			case 'user-bio':
				return new ContextCapabilities([
					ContextCapabilityType.TextBold,
					ContextCapabilityType.TextItalic,
					ContextCapabilityType.TextLink,
					ContextCapabilityType.TextCode,
					ContextCapabilityType.TextStrike,
					ContextCapabilityType.CustomLink,
					ContextCapabilityType.CodeBlock,
					ContextCapabilityType.Blockquote,
					ContextCapabilityType.Emoji,
					ContextCapabilityType.List,
					ContextCapabilityType.HorizontalRule,
					ContextCapabilityType.Spoiler,
					ContextCapabilityType.Tag,
					ContextCapabilityType.Mention,
				]);
			case 'chat-message':
				return new ContextCapabilities([
					ContextCapabilityType.TextBold,
					ContextCapabilityType.TextItalic,
					ContextCapabilityType.TextLink,
					ContextCapabilityType.TextCode,
					ContextCapabilityType.TextStrike,
					ContextCapabilityType.Media,
					ContextCapabilityType.CodeBlock,
					ContextCapabilityType.Blockquote,
					ContextCapabilityType.Emoji,
					ContextCapabilityType.List,
					ContextCapabilityType.Spoiler,
					ContextCapabilityType.Tag,
					ContextCapabilityType.Mention,
					ContextCapabilityType.Gif,
					ContextCapabilityType.Sticker,
				]);
			case 'fireside-chat-message':
				return new ContextCapabilities([
					ContextCapabilityType.TextBold,
					ContextCapabilityType.TextItalic,
					ContextCapabilityType.TextLink,
					ContextCapabilityType.TextCode,
					ContextCapabilityType.TextStrike,
					ContextCapabilityType.Spoiler,
					ContextCapabilityType.Emoji,
					ContextCapabilityType.Tag,
					ContextCapabilityType.Mention,
					ContextCapabilityType.Gif,
					ContextCapabilityType.Media,
					ContextCapabilityType.Sticker,
				]);
			case 'quest-stage-description':
				return new ContextCapabilities([
					ContextCapabilityType.TextBold,
					ContextCapabilityType.TextItalic,
					ContextCapabilityType.TextLink,
					ContextCapabilityType.TextCode,
					ContextCapabilityType.TextStrike,
					ContextCapabilityType.CustomLink,
					ContextCapabilityType.Media,
					ContextCapabilityType.EmbedVideo,
					ContextCapabilityType.EmbedMusic,
					ContextCapabilityType.EmbedModel,
					ContextCapabilityType.CodeBlock,
					ContextCapabilityType.Blockquote,
					ContextCapabilityType.Emoji,
					ContextCapabilityType.List,
					ContextCapabilityType.HorizontalRule,
					ContextCapabilityType.Spoiler,
					ContextCapabilityType.Tag,
					ContextCapabilityType.Heading,
					ContextCapabilityType.Mention,
					ContextCapabilityType.Gif,
				]);

			default:
				assertNever(context);
		}
	}
}

export function getMediaItemTypeForContext(context: ContentContext) {
	switch (context) {
		case 'fireside-post-article':
			return MediaItem.TYPE_FIRESIDE_POST_ARTICLE_IMAGE;
		case 'game-description':
			return MediaItem.TYPE_GAME_DESCRIPTION;
		case 'fireside-post-comment':
		case 'game-comment':
		case 'user-comment':
			return MediaItem.TYPE_COMMENT;
		case 'forum-post':
			return MediaItem.TYPE_FORUM_POST;
		case 'community-description':
			return MediaItem.TYPE_COMMUNITY_DESCRIPTION;
		case 'chat-message':
		case 'fireside-chat-message':
			return MediaItem.TYPE_CHAT_MESSAGE;
		case 'community-channel-description':
			return MediaItem.TYPE_COMMUNITY_CHANNEL_DESCRIPTION;
	}
	throw new Error('There is no matching media item type for the context ' + context);
}
