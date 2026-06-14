import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileUp, Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { type ContentBlock } from '@/types/domain';
import { PromptService } from '@/services/PromptService';
import { BulkUploadValidator, type ValidationError } from '@/services/BulkUploadValidator';
import { LatexText } from '@/components/common/LatexText';
import { cn } from '@/lib/utils';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (blocks: Partial<ContentBlock>[]) => Promise<void>;
  topicId: string;
}

export function BulkUploadModal({ isOpen, onClose, onUpload, topicId }: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedBlocks, setParsedBlocks] = useState<Partial<ContentBlock>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const headers = ['Type', 'Question', 'Option 1', 'Option 2', 'Option 3', 'Option 4', 'Correct Answer', 'Explanation', 'Hint', 'Tags', 'Note Content', 'Image URL'];
    const data = [
      ['single_select_mcq', 'What is the capital of France?', 'London', 'Berlin', 'Paris', 'Madrid', '3', 'It is Paris.', 'Look at the map.', 'geography, europe', '', 'https://example.com/map.png'],
      ['multi_select_mcq', 'Select prime numbers', '2', '4', '5', '9', '1, 3', '2 and 5 are prime.', 'They have only 2 factors.', 'math, numbers', '', ''],
      ['fill_in_the_blank', 'The sun rises in the {{blank}}.', '', '', '', '', 'east', 'Direction', 'Opposite of west, Solar system fact', 'science', '', ''],
      ['note', '', '', '', '', '', '', '', '', 'study-tip', '# Key Concept\nRemember this.', ''],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "examprep_bulk_template.xlsx");
  };

  const parseExcel = async (file: File) => {
    setIsParsing(true);
    setValidationErrors([]);
    setParsedBlocks([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      const { blocks, errors } = BulkUploadValidator.parseAndValidate(worksheet, topicId);
      
      if (errors.length > 0) {
        setValidationErrors(errors);
        setParsedBlocks([]);
      } else {
        setParsedBlocks(blocks);
      }

    } catch (err) {
      console.error(err);
      PromptService.error("Failed to parse Excel file. Please ensure it matches the template.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      parseExcel(f);
    }
  };

  const handleUpload = async () => {
    if (parsedBlocks.length === 0) return;
    setIsUploading(true);
    try {
      await onUpload(parsedBlocks);
      PromptService.alert(`${parsedBlocks.length} blocks uploaded successfully!`);
      onClose();
      setFile(null);
      setParsedBlocks([]);
      setValidationErrors([]);
    } catch (err) {
        console.error(err);
        PromptService.error("Failed to upload blocks.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Import Content"
      // size="lg" - Removed as it might not be supported
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isUploading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={parsedBlocks.length === 0 || isUploading || validationErrors.length > 0}>
            {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload {parsedBlocks.length > 0 ? `(${parsedBlocks.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        
        {/* Template Download */}
        <div className="bg-muted/30 p-4 rounded-lg border border-dashed flex items-center justify-between">
            <div className="flex gap-3 items-center">
               <div className="bg-primary/10 p-2 rounded-full">
                  <FileUp className="h-5 w-5 text-primary" />
               </div>
               <div>
                  <h4 className="text-sm font-medium">1. Prepare your data</h4>
                  <p className="text-xs text-muted-foreground">Download the template to format your questions correctly.</p>
               </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
               <Download className="h-3.5 w-3.5 mr-2" />
               Download Template
            </Button>
        </div>

        {/* Upload Area */}
        <div className="bg-muted/30 p-4 rounded-lg border border-dashed flex items-center justify-between">
           <div className="flex gap-3 items-center">
               <div className="bg-primary/10 p-2 rounded-full">
                  <Upload className="h-5 w-5 text-primary" />
               </div>
               <div>
                  <h4 className="text-sm font-medium">2. Upload Excel File</h4>
                  <p className="text-xs text-muted-foreground">Supported formats: .xlsx, .xls</p>
               </div>
            </div>
            <div className="relative">
              <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                  ref={fileInputRef}
              />
               <Button variant="secondary" size="sm">
                  {file ? 'Change File' : 'Select File'}
               </Button>
            </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
            <div className="border rounded-md overflow-hidden border-destructive/50">
                <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/20 text-xs font-medium flex justify-between items-center text-destructive">
                    <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Found {validationErrors.length} errors
                    </span>
                </div>
                <div className="max-h-[200px] overflow-y-auto p-0">
                    <table className="w-full text-xs">
                         <thead className="bg-destructive/5 text-destructive font-semibold">
                            <tr>
                                <th className="p-2 text-left w-16">Row</th>
                                <th className="p-2 text-left">Error</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-destructive/10">
                            {validationErrors.map((err, idx) => (
                                <tr key={idx} className="hover:bg-destructive/5">
                                    <td className="p-2 font-mono text-center">{err.row}</td>
                                    <td className="p-2 text-destructive">{err.message}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Preview */}
        {file && validationErrors.length === 0 && (
           <div className="border rounded-md overflow-hidden">
             <div className="bg-muted/50 px-4 py-2 border-b text-xs font-medium flex justify-between items-center">
                <span>Preview: {file.name}</span>
                {isParsing && <span className="text-muted-foreground">Parsing...</span>}
             </div>
             <div className="max-h-[300px] overflow-y-auto p-0">
                {parsedBlocks.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead className="bg-muted/20 text-muted-foreground">
                      <tr className="text-left">
                        <th className="p-2 font-medium">Type</th>
                        <th className="p-2 font-medium">Question / Answer</th>
                        <th className="p-2 font-medium w-20">Image</th>
                        <th className="p-2 font-medium">Tags</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                       {parsedBlocks.map((block: any, idx) => (
                         <tr key={idx} className="hover:bg-muted/10 align-top">
                           <td className="p-2 font-mono text-muted-foreground uppercase text-[10px] whitespace-nowrap">{block.kind === 'single_select_mcq' ? 'MCQ' : block.kind}</td>
                           <td className="p-2">
                              <p className="font-medium line-clamp-2 mb-1"><LatexText text={block.question || block.content} /></p>
                              {block.options && (
                                <div className="space-y-0.5">
                                  {block.options.map((opt: any) => (
                                    <div key={opt.id} className={cn("flex items-start gap-1", opt.isCorrect ? "text-success font-medium" : "text-muted-foreground")}>
                                      <span className="shrink-0">{opt.isCorrect ? '✓' : '·'}</span>
                                      <span className="line-clamp-1"><LatexText text={opt.text} /></span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {block.blankAnswers && (
                                <div className="text-success font-medium">Answer: {block.blankAnswers.join(', ')}</div>
                              )}
                           </td>
                           <td className="p-2">
                              {block.imageUrl ? (
                                <img src={String(block.imageUrl).split(/\s+/)[0]} alt="" referrerPolicy="no-referrer" className="max-h-12 rounded border border-border" />
                              ) : (
                                <span className="text-muted-foreground/40">-</span>
                              )}
                           </td>
                           <td className="p-2 text-muted-foreground">
                              {block.tags && block.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {block.tags.map((t: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{t}</span>
                                  ))}
                                </div>
                              ) : '-'}
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                ) : (
                  !isParsing && <div className="p-8 text-center text-muted-foreground text-sm">No valid blocks found in file</div>
                )}
             </div>
           </div>
        )}

      </div>
    </Modal>
  );
}
