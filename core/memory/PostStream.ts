
namespace App
{
	/**
	 * A class that allows the stream of posts for a blog to
	 * be accessed efficiently.
	 */
	export class PostStream
	{
		/** */
		static async new(segment: string)
		{
			const key = [segment, "posts"].join();
			const store = Store.current();
			const tuples = await store.get<string[]>(key) || [];
			return new PostStream(key, tuples);
		}
		
		/** */
		private constructor(
			private readonly streamKey: string,
			private readonly tuples: string[])
		{ }
		
		/** */
		get length()
		{
			return this.tuples.length;
		}
		
		/** */
		query(rangeStart: number, rangeEnd: number)
		{
			const slice = this.tuples.slice(rangeStart, rangeEnd);
			const tupleSlice = slice.map(s => s.split(tupleSeparator) as [string, string]);
			const results: PostStreamRecordFuture[] = [];
			
			for (const [sceneKey, postKey] of tupleSlice)
			{
				results.push({
					getScene: () =>
					{
						return Model.get<SceneRecord>(sceneKey);
					},
					getPost:() =>
					{
						return Model.get<PostRecord>(postKey);
					}
				});
			}
			
			return results;
		}
		
		/**
		 * Inserts a reference to the PostRecord at the beginning of the post stream.
		 */
		insert(post: PostRecord)
		{
			const sceneKey = post.scenes.length ? Key.of(post.scenes[0]) : "";
			const postKey = Not.falsey(Key.of(post));
			const tuple = [sceneKey, postKey].join(tupleSeparator);
			this.tuples.unshift(tuple);
			this.queueSave();
		}
		
		/** */
		delete(index: number)
		{
			const count = this.tuples.splice(index, 1).length;
			if (count > 0)
				this.queueSave();
		}
		
		/** */
		move(targetIndex: number, newIndex: number)
		{
			if (targetIndex === newIndex)
				return;
			
			const tuple = this.tuples.splice(targetIndex, 1)[0];
			if (!tuple)
				return;
			
			const idx = newIndex + (targetIndex < newIndex ? 0 : 1);
			this.tuples.splice(idx, 0, tuple);
			this.queueSave();
		}
		
		/** */
		private queueSave()
		{
			clearTimeout(this.timeoutId);
			
			this.timeoutId = setTimeout(() =>
			{
				Store.current().set(this.streamKey, this.tuples);
			},
			10);
		}
		private timeoutId: any = 0;
	}
	
	/** */
	export interface PostStreamRecordFuture
	{
		getScene(): Promise<SceneRecord>;
		getPost(): Promise<PostRecord>;
	}
	
	const tupleSeparator = ":";
}