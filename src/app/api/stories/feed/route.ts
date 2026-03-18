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
  const minRatingParam = searchParams.get("minRating") ?? "";
  const minRating = minRatingParam ? parseFloat(minRatingParam) : null;

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
      // ratingCount: use precomputed value when available, else derive from ratings map
      ratingCount: {
        $ifNull: [
          "$stories.ratingCount",
          { $size: { $ifNull: [{ $objectToArray: "$stories.ratings" }, []] } },
        ],
      },
      // avgRating: prefer stored avg, otherwise compute from ratings map values
      avgRating: {
        $ifNull: [
          "$stories.avgRating",
          {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $ifNull: [{ $objectToArray: "$stories.ratings" }, []],
                    },
                  },
                  0,
                ],
              },
              {
                $avg: {
                  $map: {
                    input: { $objectToArray: "$stories.ratings" },
                    as: "r",
                    in: "$$r.v",
                  },
                },
              },
              0,
            ],
          },
        ],
      },
      excerpt: {
        $let: {
          vars: {
            p0: {
              $arrayElemAt: [{ $ifNull: ["$stories.story.paragraphs", []] }, 0],
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

  // Optional rating filter (min average rating)
  if (minRating !== null) {
    pipeline.push({ $match: { avgRating: { $gte: minRating } } });
  }

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
