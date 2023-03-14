/**
 * @copyright (c) MacDonald Thoughtstuff Inc.
 * @license
 * Use of this software is governed by the Business Source License included in the LICENSE file and at
 * www.mariadb.com/bsl11.
 *
 * Change Date: 2027-03-14. On this date, in accordance with the Business Source License, use of this software will be
 * governed by the Mozilla Public License, Version 2.
 */
import { ArticleFeature } from "./Article/Article.ts";
import { FilesFeature } from "./Files/Files.ts";
import { HeroImageFeature } from "./HeroImage/HeroImage.ts";
import { ImageFeature } from "./Image/Image.ts";

export const features = [
    ArticleFeature,
    FilesFeature,
    HeroImageFeature,
    ImageFeature,
];
