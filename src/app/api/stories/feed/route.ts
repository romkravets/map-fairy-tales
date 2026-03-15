// src/app/api/stories/feed/route.ts
// GET → paginated, sortable, searchable list of all public stories

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/db/mongodb";
import MapEntry from "@/models/MapEntry";

export const runtime = "nodejs";

const LIMIT = 24;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") ?? "views"; // views | likes | comments
  const search = (searchParams.get("search") ?? "").trim();
  const page = Math.max(0, parseInt(searchParams.get("page") ?? "0", 10));

  await connectDB();

  const pipeline: any[] = [
    { $unwind: "$stories" },
    // isPublic: undefined (legacy) → treat as public; only exclude explicit false
    { $match: { "stories.isPublic": { $ne: false } } },
  ];

  if (search) {
    pipeline.push({
      $match: { "stories.story.title": { $regex: search, $options: "i" } },
    });
  }

  pipeline.push({
    $project: {
      _id: 0,
      storyId: "$stories.id",
      countryId: "$mapId",
      region: "$stories.region",
      title: { $ifNull: ["$stories.story.title", ""] },
      imageUrl: { $ifNull: ["$stories.story.imageUrl", ""] },
      viewCount: { $ifNull: ["$stories.viewCount", 0] },
      likesCount: {
        $size: { $ifNull: [{ $objectToArray: "$stories.likes" }, []] },
      },
      excerpt: {
        $let: {
          vars: {
            p0: {
              $arrayElemAt: [
                { $ifNull: ["$stories.story.paragraphs", []] },
                0,
              ],
            },
          },
          in: { $ifNull: ["$$p0.paragraph", ""] },
        },
      },
    },
  });

  // Join comment counts
  pipeline.push({
    $lookup: {
      from: "comments",
      let: { sid: "$storyId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$storyId", "$$sid"] } } },
        { $count: "n" },
      ],
      as: "_c",
    },
  });

  pipeline.push({
    $addFields: {
      commentsCount: { $ifNull: [{ $arrayElemAt: ["$_c.n", 0] }, 0] },
    },
  });

  pipeline.push({ $project: { _c: 0 } });

  const sortField =
    sort === "likes"
      ? "likesCount"
      : sort === "comments"
        ? "commentsCount"
        : "viewCount";

  pipeline.push({ $sort: { [sortField]: -1, storyId: 1 } });

  // Count before pagination
  const countPipeline = [...pipeline, { $count: "total" }];
  pipeline.push({ $skip: page * LIMIT });
  pipeline.push({ $limit: LIMIT });

  const [stories, countResult] = await Promise.all([
    MapEntry.aggregate(pipeline),
    MapEntry.aggregate(countPipeline),
  ]);

  const total = (countResult[0] as any)?.total ?? 0;

  return NextResponse.json({ stories, total, page, limit: LIMIT });
}
