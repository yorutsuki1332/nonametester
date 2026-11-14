import JourneyArticle from './journey-article';
import { getJourneyPost, JOURNEY_POSTS } from '@/lib/journey';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return JOURNEY_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = getJourneyPost(slug);
  return {
    title: post ? `${post.title} | VILLA ATELIER 品牌誌` : '品牌誌 | VILLA ATELIER',
  };
}

export default async function JourneyArticlePage({ params }: PageProps) {
  const { slug } = await params;
  return <JourneyArticle slug={slug} />;
}
