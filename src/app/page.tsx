// pages/index.tsx
'use client'
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Trash2, Plus } from 'lucide-react';

// Types
interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface Prescription {
  patientName: string;
  patientDOB: string;
  medicines: Medicine[];
  prescribedDate: string;
  notes?: string;
  prescriptionImage?: FileList;
}

// S3 Client setup
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION!,
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY!,
  },
});

// Medicine Field Component
const MedicineField: React.FC<{
  register: any;
  index: number;
  onRemove: () => void;
  errors: any;
  isRemovable: boolean;
}> = ({ register, index, onRemove, errors, isRemovable }) => {
  return (
    <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Medicine #{index + 1}</h3>
        {isRemovable && (
          <button
            type="button"
            onClick={onRemove}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Medicine Name
            <input
              type="text"
              {...register(`medicines.${index}.name`, {
                required: 'Medicine name is required'
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter medicine name"
            />
          </label>
          {errors.medicines?.[index]?.name && (
            <p className="mt-1 text-sm text-red-600">
              {errors.medicines[index]?.name?.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Dosage
            <input
              type="text"
              {...register(`medicines.${index}.dosage`, {
                required: 'Dosage is required'
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g., 500mg"
            />
          </label>
          {errors.medicines?.[index]?.dosage && (
            <p className="mt-1 text-sm text-red-600">
              {errors.medicines[index]?.dosage?.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Frequency
            <input
              type="text"
              {...register(`medicines.${index}.frequency`, {
                required: 'Frequency is required'
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g., Twice daily"
            />
          </label>
          {errors.medicines?.[index]?.frequency && (
            <p className="mt-1 text-sm text-red-600">
              {errors.medicines[index]?.frequency?.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Duration
            <input
              type="text"
              {...register(`medicines.${index}.duration`, {
                required: 'Duration is required'
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="e.g., 7 days"
            />
          </label>
          {errors.medicines?.[index]?.duration && (
            <p className="mt-1 text-sm text-red-600">
              {errors.medicines[index]?.duration?.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Special Instructions
            <textarea
              {...register(`medicines.${index}.instructions`)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              rows={2}
              placeholder="Any special instructions for taking this medicine"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

// Main Prescription Form Component
const PrescriptionForm: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<Prescription>({
    defaultValues: {
      medicines: [{
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "medicines"
  });

  const uploadToS3 = async (file: File): Promise<string> => {
    const fileName = `prescriptions/${Date.now()}-${file.name}`;
    const command = new PutObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME,
      Key: fileName,
      ContentType: file.type,
    });

    try {
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      const upload = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!upload.ok) throw new Error('Upload failed');
      return fileName;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const onSubmit = async (data: Prescription) => {
    console.log(data);
    try {
      setIsSubmitting(true);
      let fileUrl: string | undefined;

      if (data.prescriptionImage?.[0]) {
        fileUrl = await uploadToS3(data.prescriptionImage[0]);
      }

      // Here you would typically send the data to your backend
      const prescriptionData = {
        ...data,
        prescriptionImageUrl: fileUrl,
      };

      console.log('Prescription Data:', prescriptionData);
      alert('Prescription submitted successfully!');
      reset();
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit prescription. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Prescription Management System
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Create and manage prescriptions with multiple medicines
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Patient Name
                <input
                  type="text"
                  {...register('patientName', { required: 'Patient name is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </label>
              {errors.patientName && (
                <p className="mt-1 text-sm text-red-600">{errors.patientName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date of Birth
                <input
                  type="date"
                  {...register('patientDOB', { required: 'Date of birth is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </label>
              {errors.patientDOB && (
                <p className="mt-1 text-sm text-red-600">{errors.patientDOB.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Prescribed Date
                <input
                  type="date"
                  {...register('prescribedDate', { required: 'Prescribed date is required' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </label>
              {errors.prescribedDate && (
                <p className="mt-1 text-sm text-red-600">{errors.prescribedDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Medicines</h2>
              <button
                type="button"
                onClick={() => append({ name: '', dosage: '', frequency: '', duration: '', instructions: '' })}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Medicine
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <MedicineField
                  key={field.id}
                  register={register}
                  index={index}
                  onRemove={() => remove(index)}
                  errors={errors}
                  isRemovable={fields.length > 1}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Additional Notes
              <textarea
                {...register('notes')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prescription Image (Optional)
              <input
                type="file"
                accept="image/*,.pdf"
                {...register('prescriptionImage')}
                className="mt-1 block w-full"
              />
            </label>
          </div>

          {uploadProgress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Prescription'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrescriptionForm;