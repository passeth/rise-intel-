import { redirect } from 'next/navigation'

interface IngredientRedirectPageProps {
  params: Promise<{ ingredientCode: string }>
}

export default async function IngredientRedirectPage({
  params,
}: IngredientRedirectPageProps) {
  const { ingredientCode } = await params
  redirect(`/v2/ingredients/${encodeURIComponent(ingredientCode)}`)
}
