/// <reference path="Record.ts" />

namespace Turf
{
	/** */
	export class MetaRecord extends Record
	{
		user = {} as IUser;
		colorScheme: UI.IColor[] = [];
		font = "";
		htmlHeader = "";
		htmlFooter = "";
	}
	
	/** */
	export namespace ColorIndex
	{
		export const black = -1;
		export const white = -2;
		export const transparent = -3;
	}
	
	/** */
	export interface IUser
	{
		email: string;
		password: string;
		s3AccessKey: string;
		s3SecretKey: string;
	}
	
	/** */
	export class PatchRecord extends Record
	{
		title = "";
		description = "";
		slug = "";
		htmlHeader = "";
		htmlFooter = "";
		draft = true;
		dateCreated = Date.now();
		datePublished = 0;
		blades = Back.array(BladeRecord);
	}
	
	/** */
	export abstract class BladeRecord extends Record
	{
		transition = Transitions.slide.name;
		backgroundColorIndex: number = ColorIndex.black;
	}
	
	/** */
	export class CaptionedBladeRecord extends BladeRecord
	{
		textContrast = 50;
		effect = Effects.none.name;
		origin = Origin.center;
		contentImage = Back.reference(MediaRecord);
		contentImageWidth = 50;
		titles: ITitle[] = [];
		description = "";
		descriptionSize = 3;
		backgrounds = Back.array(BackgroundRecord);
	}
	
	/** */
	export interface ITitle
	{
		text: string;
		size: number;
		weight: number;
	}
	
	/** */
	export class BackgroundRecord extends Record
	{
		media = Back.reference(MediaRecord);
		crop: [number, number, number, number] = [0, 0, -1, -1];
		position: [number, number] = [0, 0];
		zoom: -1 | 0 | 1 = 0;
	}
	
	/** */
	export class GalleryBladeRecord extends BladeRecord
	{
		frames = Back.array(FrameRecord);
	}
	
	/** */
	export class ProseBladeRecord extends BladeRecord
	{
		html = "";
	}
	
	/** */
	export class VideoBladeRecord extends BladeRecord
	{
		size: SizeMethod = "cover";
		media = Back.reference(MediaRecord);
	}
	
	/** */
	export class FrameRecord extends Record
	{
		captionLine1 = "";
		captionLine2 = "";
		textContrast = 0;
		size: SizeMethod = "contain";
		media = Back.reference(MediaRecord);
	}
	
	/** */
	export class MediaRecord extends Record
	{
		/**
		 * A friendly name for the media object.
		 * Typically the name of the file as it was sent in from the operating system.
		 */
		name = "";
		
		/**
		 * The mime type of the media object.
		 */
		type = MimeType.unknown;
		
		/** 
		 * A blob that stores the actual data of the media object.
		 */
		blob = new Blob();
		
		/** */
		getBlobUrl()
		{
			return blobUrls.get(this) || (() =>
			{
				const url = URL.createObjectURL(this.blob);
				blobUrls.set(this, url);
				return url;
			})();
		}
		
		/** */
		getBlobCssUrl()
		{
			return `url(${this.getBlobUrl()})`;
		}
		
		/** */
		getHttpUrl()
		{
			return this.name || "unnamed-file";
		}
	}
	
	const blobUrls = new WeakMap<MediaRecord, string>();
	
	/** */
	export const enum TextEffect
	{
		scrollAlignTopLeft,
		scrollAlignTop,
		scrollAlignTopRight,
		scrollAlignLeft,
		scrollAlignCenter,
		scrollAlignRight,
		scrollAlignBottomLeft,
		scrollAlignBottom,
		scrollAlignBottomRight,
		zoomBlur,
		zoomExpand,
		zoomBlurExpand,
	}
}
