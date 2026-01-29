import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { MainLayout } from "@/components/layout/MainLayout"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "../components/ui/textarea"
import { useGem } from "@/hooks/useGemStore"

export function IntakePage() {
  const [formData, setFormData] = useState({
    emeraldWeight: "",
    diamondWeight: "",
    totalArticleWeight: "",
    color: "",
    itemDescription: "",
  })
  const [image, setImage] = useState<File | null>(null)

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { handleIntake } = useGem()
  const navigate = useNavigate()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await handleIntake(formData, image || undefined)
      navigate("/queue")
    } catch (error) {
      console.error("Failed to intake gem:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MainLayout>
      <div className='max-w-xl mx-auto space-y-6'>
        <h2 className='text-2xl font-bold text-slate-800'>New Gem Intake</h2>
        <Card className='p-6'>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Emerald Weight (ct)</label>
                <Input
                  type='number'
                  step='0.001'
                  placeholder='14.36'
                  value={formData.emeraldWeight}
                  onChange={(e) => setFormData({ ...formData, emeraldWeight: e.target.value })}
                  required
                />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Diamond Weight (ct)</label>
                <Input
                  type='number'
                  step='0.001'
                  placeholder='4.25'
                  value={formData.diamondWeight}
                  onChange={(e) => setFormData({ ...formData, diamondWeight: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Total Article Weight (g)</label>
              <Input
                type='number'
                step='0.01'
                placeholder='12.45'
                value={formData.totalArticleWeight}
                onChange={(e) => setFormData({ ...formData, totalArticleWeight: e.target.value })}
                required
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Color</label>
              <Input
                type='text'
                placeholder='e.g. Blue'
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                required
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Item Description</label>
              <Textarea
                placeholder='e.g. One Yellow Gold & Platinum Ring set with One Natural Blue Sapphire & many small Diamonds.'
                value={formData.itemDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, itemDescription: e.target.value })
                }
                className='min-h-[100px]'
                required
              />
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Gem Image</label>
              <Input
                type='file'
                accept='image/*'
                onChange={handleImageChange}
                className='cursor-pointer'
              />
              {imagePreview && (
                <div className='mt-2 relative aspect-video w-full overflow-hidden rounded-lg border border-slate-200'>
                  <img src={imagePreview} alt='Preview' className='h-full w-full object-cover' />
                </div>
              )}
            </div>

            <div className='pt-4'>
              <Button type='submit' className='w-full' disabled={isSubmitting}>
                <Plus size={18} className='mr-2' />
                {isSubmitting ? "Processing..." : "Add to Workflow"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  )
}
